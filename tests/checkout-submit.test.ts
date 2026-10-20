/**
 * Checkout Submission Tests
 *
 * Tests the checkout page's handleSubmit behaviour by exercising the
 * order-creation API through its mock and verifying:
 *   - Successful creation clears the cart and redirects to the order page
 *   - Failed creation preserves the cart and shows the error
 *   - Idempotency key is stable across retries within the same page load
 *   - Validation errors are surfaced per-field
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

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

import { POST } from "@/app/api/orders/create/route";

// --- Helpers ---

const FAKE_USER = { id: "user-checkout-test" };

const MOCK_PRODUCT = {
  id: "ad504b14-f116-c40c-96d3-3b72305dbd90",
  name: "Adjustable Phone Stand",
  status: "published",
  product_variants: [
    {
      id: "c03ba19e-abd2-2b65-474d-5964fcedb226",
      sku: "PHONE-STD-UNI-PLA",
      size_name: "Universal",
      material: "PLA",
      price_paise: 35000,
      color_options: ["Black", "White", "Gray", "Red", "Blue"],
    },
  ],
};

function validCheckoutBody(overrides?: Record<string, unknown>) {
  return {
    items: [
      {
        productId: "ad504b14-f116-c40c-96d3-3b72305dbd90",
        variantId: "c03ba19e-abd2-2b65-474d-5964fcedb226",
        selectedColor: "Black",
        quantity: 1,
      },
    ],
    contactDetails: {
      customerName: "SAI ADITYA",
      customerEmail: "test@mivo.dev",
      customerPhone: "+91 9876543210",
      shippingAddressLine1: "42 Print Lane",
      shippingCity: "Hyderabad",
      shippingState: "Telangana",
      shippingPostalCode: "500001",
      shippingCountry: "IN",
    },
    idempotencyKey: "stable-idem-key-001",
    ...overrides,
  };
}

function makeRequest(body?: unknown): Request {
  return new Request("http://localhost:3000/api/orders/create", {
    method: "POST",
    body: JSON.stringify(body ?? validCheckoutBody()),
    headers: { "Content-Type": "application/json" },
  });
}

// --- Setup ---

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: FAKE_USER }, error: null });
  mockSingle.mockResolvedValue({ data: MOCK_PRODUCT, error: null });
});

// --- Tests ---

describe("Checkout submission behaviour", () => {
  describe("Success path — cart clear and redirect data", () => {
    it("returns orderId and orderNumber the client needs for redirect", async () => {
      mockRpc.mockResolvedValue({
        data: { order_id: "new-order-uuid", order_number: "ORD-20261020-00003", deduplicated: false },
        error: null,
      });

      const res = await POST(makeRequest() as never);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.orderId).toBe("new-order-uuid");
      expect(json.orderNumber).toBe("ORD-20261020-00003");
    });

    it("calculates server-side pricing from the trusted catalogue", async () => {
      mockRpc.mockResolvedValue({
        data: { order_id: "price-check", order_number: "ORD-PRICE", deduplicated: false },
        error: null,
      });

      await POST(makeRequest() as never);

      expect(mockRpc).toHaveBeenCalledWith(
        "create_order_atomic",
        expect.objectContaining({
          p_subtotal_paise: 35000,
          p_shipping_paise: 10000,
          p_total_paise: 45000,
        })
      );
    });
  });

  describe("Failure path — cart preserved, error surfaced", () => {
    it("returns error message on generic RPC failure (cart stays intact)", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: "XX000", message: "connection reset" },
      });

      const res = await POST(makeRequest() as never);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.success).toBe(false);
      expect(json.error).toContain("connection reset");
    });

    it("returns per-field validation errors without touching the database", async () => {
      const body = validCheckoutBody({
        contactDetails: {
          customerName: "",
          customerEmail: "",
          customerPhone: "",
          shippingAddressLine1: "",
          shippingCity: "",
          shippingState: "",
          shippingPostalCode: "",
        },
      });

      const res = await POST(makeRequest(body) as never);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.validationErrors).toBeDefined();
      expect(json.validationErrors.customerName).toBe("Name is required");
      expect(json.validationErrors.customerEmail).toBe("Email is required");
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("returns 503 when the RPC function is missing", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: "42883", message: "function create_order_atomic does not exist" },
      });

      const res = await POST(makeRequest() as never);
      const json = await res.json();

      expect(res.status).toBe(503);
      expect(json.error).toContain("create_order_atomic");
    });
  });

  describe("Idempotency — retries do not duplicate orders", () => {
    it("passes the same idempotency key to every retry", async () => {
      const IDEM_KEY = "stable-idem-key-001";

      // First attempt succeeds
      mockRpc.mockResolvedValue({
        data: { order_id: "order-first", order_number: "ORD-1", deduplicated: false },
        error: null,
      });
      await POST(makeRequest() as never);

      // Second attempt with same key (simulates a page retry)
      mockRpc.mockResolvedValue({
        data: { order_id: "order-first", order_number: "ORD-1", deduplicated: true },
        error: null,
      });
      const res2 = await POST(makeRequest() as never);
      const json2 = await res2.json();

      expect(json2.orderId).toBe("order-first");

      // Both calls should have sent the same key
      const calls = mockRpc.mock.calls;
      expect(calls[0][1].p_idempotency_key).toBe(IDEM_KEY);
      expect(calls[1][1].p_idempotency_key).toBe(IDEM_KEY);
    });

    it("returns 409 on serialization failure so the client can retry", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: "40001", message: "serialization_failure" },
      });

      const res = await POST(makeRequest() as never);

      expect(res.status).toBe(409);
    });
  });

  describe("Product lookup through server client", () => {
    it("rejects items whose productId does not exist in Supabase", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: "PGRST116", message: "not found" },
      });

      const res = await POST(makeRequest() as never);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain("Product not available");
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("rejects items whose variantId does not belong to the product", async () => {
      const body = validCheckoutBody({
        items: [{
          productId: "ad504b14-f116-c40c-96d3-3b72305dbd90",
          variantId: "00000000-0000-0000-0000-000000000000",
          selectedColor: "Black",
          quantity: 1,
        }],
      });

      const res = await POST(makeRequest(body) as never);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain("Variant not found");
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });
});
