/**
 * Order Creation API Tests
 *
 * Tests the POST /api/orders/create route handler by mocking
 * Supabase and Next.js server primitives. Covers:
 *   - Successful atomic order creation via RPC
 *   - Missing RPC function (503 Service Unavailable, no fallback)
 *   - Generic RPC failure (500)
 *   - Serialization failure / concurrent duplicate (409)
 *   - Idempotent retry returning existing order
 *   - Null RPC result handling
 *   - Authentication guard
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks (must be before any imports that use them) ----------------

const mockRpc = vi.fn();
const mockGetUser = vi.fn();
const mockSingle = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: () => {},
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () => mockSingle(),
          }),
        }),
      }),
    }),
  }),
}));

// --- Helpers ---------------------------------------------------------

const FAKE_USER = { id: "user-uuid-123" };

const MOCK_PRODUCT = {
  id: "prod-001",
  name: "Modular Desk Organizer",
  status: "published",
  product_variants: [
    {
      id: "var-001-1",
      sku: "DESK-ORG-SM-PLA",
      size_name: "Small",
      material: "PLA",
      price_paise: 45000,
      color_options: ["Black", "White", "Gray", "Blue"],
    },
  ],
};

function validBody() {
  return {
    items: [
      { productId: "prod-001", variantId: "var-001-1", selectedColor: "Black", quantity: 2 },
    ],
    contactDetails: {
      customerName: "Test User",
      customerEmail: "test@example.com",
      customerPhone: "9876543210",
      shippingAddressLine1: "123 Main St",
      shippingCity: "Mumbai",
      shippingState: "Maharashtra",
      shippingPostalCode: "400001",
    },
    idempotencyKey: "idem-key-001",
  };
}

function makeRequest(body: unknown = validBody()): Request {
  return new Request("http://localhost:3000/api/orders/create", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

// --- Import handler after mocks are set up ---------------------------

import { POST } from "@/app/api/orders/create/route";

// --- Tests -----------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: FAKE_USER }, error: null });
  mockSingle.mockResolvedValue({ data: MOCK_PRODUCT, error: null });
});

describe("POST /api/orders/create", () => {
  describe("Successful creation", () => {
    it("returns orderId and orderNumber on successful RPC call", async () => {
      mockRpc.mockResolvedValue({
        data: { order_id: "order-uuid-1", order_number: "ORD-20261020-00001", deduplicated: false },
        error: null,
      });

      const res = await POST(makeRequest() as never);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.orderId).toBe("order-uuid-1");
      expect(json.orderNumber).toBe("ORD-20261020-00001");
    });

    it("passes the idempotency key and customer_id to the RPC", async () => {
      mockRpc.mockResolvedValue({
        data: { order_id: "order-uuid-2", order_number: "ORD-20261020-00002", deduplicated: false },
        error: null,
      });

      await POST(makeRequest() as never);

      expect(mockRpc).toHaveBeenCalledWith("create_order_atomic", expect.objectContaining({
        p_idempotency_key: "idem-key-001",
        p_customer_id: "user-uuid-123",
      }));
    });
  });

  describe("Missing RPC function (not deployed)", () => {
    it("returns 503 when RPC error code is 42883", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: "42883", message: "function create_order_atomic does not exist" },
      });

      const res = await POST(makeRequest() as never);
      const json = await res.json();

      expect(res.status).toBe(503);
      expect(json.success).toBe(false);
      expect(json.error).toContain("create_order_atomic");
    });

    it("returns 503 when RPC error message contains 'does not exist'", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: "PGRST202", message: "Could not find the function public.create_order_atomic does not exist" },
      });

      const res = await POST(makeRequest() as never);
      const json = await res.json();

      expect(res.status).toBe(503);
      expect(json.success).toBe(false);
    });

    it("does NOT create an order through any fallback path", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: "42883", message: "function does not exist" },
      });

      await POST(makeRequest() as never);

      expect(mockRpc).toHaveBeenCalledTimes(1);
      expect(mockRpc).toHaveBeenCalledWith("create_order_atomic", expect.anything());
    });
  });

  describe("RPC failure (generic)", () => {
    it("returns 500 on unexpected database error", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: "XX000", message: "internal error" },
      });

      const res = await POST(makeRequest() as never);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toContain("internal error");
    });

    it("returns 500 when RPC returns null data without error", async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      const res = await POST(makeRequest() as never);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toContain("no result returned");
    });
  });

  describe("Concurrent / duplicate requests (serialization failure)", () => {
    it("returns 409 when RPC raises serialization_failure (code 40001)", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: "40001", message: "Concurrent order submission detected. Please retry." },
      });

      const res = await POST(makeRequest() as never);
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Concurrent");
    });

    it("returns 409 when error message mentions serialization_failure", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: "P0001", message: "ERROR: serialization_failure" },
      });

      const res = await POST(makeRequest() as never);

      expect(res.status).toBe(409);
    });
  });

  describe("Idempotent retry returns existing order", () => {
    it("returns the existing order on deduplicated=true", async () => {
      mockRpc.mockResolvedValue({
        data: { order_id: "existing-order-uuid", order_number: "ORD-20261020-00010", deduplicated: true },
        error: null,
      });

      const res = await POST(makeRequest() as never);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.orderId).toBe("existing-order-uuid");
    });
  });

  describe("Authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const res = await POST(makeRequest() as never);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Authentication");
    });

    it("returns 401 when auth returns an error", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "JWT expired" },
      });

      const res = await POST(makeRequest() as never);

      expect(res.status).toBe(401);
    });
  });

  describe("Input validation", () => {
    it("returns 400 when items array is empty", async () => {
      const res = await POST(makeRequest({ ...validBody(), items: [] }) as never);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain("at least one item");
    });

    it("returns 400 when contact details are incomplete", async () => {
      const body = {
        ...validBody(),
        contactDetails: {
          customerName: "",
          customerEmail: "",
          customerPhone: "",
          shippingAddressLine1: "",
          shippingCity: "",
          shippingState: "",
          shippingPostalCode: "",
        },
      };

      const res = await POST(makeRequest(body) as never);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.validationErrors).toBeDefined();
    });

    it("returns 400 when product is not found", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: "PGRST116", message: "not found" } });

      const res = await POST(makeRequest() as never);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain("Product not available");
    });
  });

  describe("Auto-generated idempotency key", () => {
    it("generates an idempotency key when none is provided", async () => {
      mockRpc.mockResolvedValue({
        data: { order_id: "order-auto", order_number: "ORD-AUTO", deduplicated: false },
        error: null,
      });

      const body = validBody();
      delete (body as Record<string, unknown>).idempotencyKey;

      await POST(makeRequest(body) as never);

      expect(mockRpc).toHaveBeenCalledWith(
        "create_order_atomic",
        expect.objectContaining({
          p_idempotency_key: expect.stringMatching(/^auto_user-uuid-123_/),
        })
      );
    });
  });
});
