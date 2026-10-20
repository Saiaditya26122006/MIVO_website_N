/**
 * Quotation Creation API Tests
 *
 * Tests the POST /api/quotations/create route handler by mocking
 * Supabase and Next.js server primitives. Covers:
 *   - Successful quotation creation with generated reference
 *   - Validation: required fields rejected when empty
 *   - Validation: custom dimensions required when flag is set
 *   - Authentication guard (401)
 *   - Quote reference generation failure (500)
 *   - Database insert failure (500)
 *   - Budget range validation (server-side passthrough)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

const mockRpc = vi.fn();
const mockGetUser = vi.fn();
const mockInsert = vi.fn();
const mockSelectAfterInsert = vi.fn();
const mockSingleAfterInsert = vi.fn();

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
      insert: (data: unknown) => {
        mockInsert(data);
        return {
          select: () => {
            mockSelectAfterInsert();
            return { single: () => mockSingleAfterInsert() };
          },
        };
      },
    }),
  }),
}));

import { POST } from "@/app/api/quotations/create/route";

// --- Helpers ---

const FAKE_USER = { id: "user-quotation-test" };

function validQuotationBody(overrides?: Record<string, unknown>) {
  return {
    customerName: "SAI ADITYA",
    customerEmail: "test@mivo.dev",
    customerPhone: "+91 9876543210",
    projectTitle: "Custom Phone Stand",
    projectDescription: "A desk phone stand with cable routing and adjustable angle.",
    categoryId: "e70dd391-86ca-2ebf-2575-42987db7603a",
    hasCustomDimensions: false,
    hasCustomDesign: false,
    preferredMaterial: "PLA",
    preferredColor: "Black",
    quantity: 3,
    budgetMinPaise: 20000,
    budgetMaxPaise: 50000,
    requiredByDate: "2026-12-01",
    additionalNotes: "Matte finish preferred.",
    ...overrides,
  };
}

function makeRequest(body?: unknown): Request {
  return new Request("http://localhost:3000/api/quotations/create", {
    method: "POST",
    body: JSON.stringify(body ?? validQuotationBody()),
    headers: { "Content-Type": "application/json" },
  });
}

// --- Setup ---

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: FAKE_USER }, error: null });
  mockRpc.mockResolvedValue({ data: "QTE-20261020-00001", error: null });
  mockSingleAfterInsert.mockResolvedValue({
    data: { id: "new-quotation-uuid", quote_reference: "QTE-20261020-00001" },
    error: null,
  });
});

// --- Tests ---

describe("Quotation creation API", () => {
  describe("Success path", () => {
    it("returns quotationId and quoteReference on successful creation", async () => {
      const res = await POST(makeRequest() as never);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.quotationId).toBe("new-quotation-uuid");
      expect(json.quoteReference).toBe("QTE-20261020-00001");
    });

    it("calls generate_quote_reference RPC before inserting", async () => {
      await POST(makeRequest() as never);

      expect(mockRpc).toHaveBeenCalledWith("generate_quote_reference");
      expect(mockInsert).toHaveBeenCalledTimes(1);
    });

    it("passes all form fields to the database insert", async () => {
      await POST(makeRequest() as never);

      const insertedData = mockInsert.mock.calls[0][0];
      expect(insertedData.customer_name).toBe("SAI ADITYA");
      expect(insertedData.customer_email).toBe("test@mivo.dev");
      expect(insertedData.project_title).toBe("Custom Phone Stand");
      expect(insertedData.quantity).toBe(3);
      expect(insertedData.preferred_material).toBe("PLA");
      expect(insertedData.budget_min_paise).toBe(20000);
      expect(insertedData.budget_max_paise).toBe(50000);
      expect(insertedData.status).toBe("pending_review");
      expect(insertedData.customer_id).toBe("user-quotation-test");
    });
  });

  describe("Authentication", () => {
    it("returns 401 when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: "not authenticated" } });

      const res = await POST(makeRequest() as never);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toContain("Authentication required");
      expect(mockRpc).not.toHaveBeenCalled();
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  describe("Validation — required fields", () => {
    it("rejects empty customerName", async () => {
      const body = validQuotationBody({ customerName: "" });
      const res = await POST(makeRequest(body) as never);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.validationErrors.customerName).toBe("Name is required");
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("rejects empty customerEmail", async () => {
      const body = validQuotationBody({ customerEmail: "" });
      const res = await POST(makeRequest(body) as never);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.validationErrors.customerEmail).toBe("Email is required");
    });

    it("rejects empty projectTitle", async () => {
      const body = validQuotationBody({ projectTitle: "" });
      const res = await POST(makeRequest(body) as never);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.validationErrors.projectTitle).toBe("Project title is required");
    });

    it("rejects empty projectDescription", async () => {
      const body = validQuotationBody({ projectDescription: "" });
      const res = await POST(makeRequest(body) as never);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.validationErrors.projectDescription).toBe("Project description is required");
    });

    it("rejects quantity less than 1", async () => {
      const body = validQuotationBody({ quantity: 0 });
      const res = await POST(makeRequest(body) as never);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.validationErrors.quantity).toBe("Quantity must be at least 1");
    });

    it("returns all validation errors at once", async () => {
      const body = validQuotationBody({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        projectTitle: "",
        projectDescription: "",
        quantity: 0,
      });

      const res = await POST(makeRequest(body) as never);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(Object.keys(json.validationErrors).length).toBeGreaterThanOrEqual(6);
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  describe("Validation — custom dimensions", () => {
    it("requires dimensions when hasCustomDimensions is true", async () => {
      const body = validQuotationBody({
        hasCustomDimensions: true,
        customLengthMm: 0,
        customWidthMm: undefined,
        customHeightMm: -1,
      });

      const res = await POST(makeRequest(body) as never);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.validationErrors.customLengthMm).toBe("Length is required");
      expect(json.validationErrors.customWidthMm).toBe("Width is required");
      expect(json.validationErrors.customHeightMm).toBe("Height is required");
    });

    it("does not require dimensions when hasCustomDimensions is false", async () => {
      const body = validQuotationBody({
        hasCustomDimensions: false,
        customLengthMm: undefined,
        customWidthMm: undefined,
        customHeightMm: undefined,
      });

      const res = await POST(makeRequest(body) as never);

      expect(res.status).toBe(200);
    });
  });

  describe("Failure paths", () => {
    it("returns 500 when generate_quote_reference fails", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: "42883", message: "function not found" },
      });

      const res = await POST(makeRequest() as never);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toContain("quote reference");
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("returns 500 when database insert fails", async () => {
      mockSingleAfterInsert.mockResolvedValue({
        data: null,
        error: { code: "23505", message: "duplicate key" },
      });

      const res = await POST(makeRequest() as never);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toContain("Failed to create quotation");
    });

    it("returns 500 on unexpected exception", async () => {
      mockGetUser.mockRejectedValue(new Error("network timeout"));

      const res = await POST(makeRequest() as never);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Internal server error");
    });
  });
});
