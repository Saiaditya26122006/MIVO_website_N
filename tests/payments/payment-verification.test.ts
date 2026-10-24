/**
 * Payment Verification Tests
 * Tests for payment verification, amount validation, and COD isolation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/payments/razorpay/verify/route";
import { NextRequest } from "next/server";
import crypto from "crypto";

// Mock environment
const mockEnv = {
  RAZORPAY_KEY_SECRET: "test_key_secret_12345",
};

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
  rpc: vi.fn(),
};

// Mock admin client
const mockAdminClient = {
  rpc: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}));

vi.mock("@/lib/payments/razorpay", async () => {
  const actual = await vi.importActual("@/lib/payments/razorpay");
  return {
    ...actual,
    verifyPaymentSignature: (orderId: string, paymentId: string, signature: string) => {
      const expectedSignature = crypto
        .createHmac("sha256", mockEnv.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");
      return signature === expectedSignature;
    },
    fetchPaymentDetails: vi.fn(),
  };
});

describe("Payment Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RAZORPAY_KEY_SECRET", mockEnv.RAZORPAY_KEY_SECRET);

    // Default successful auth
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user_123", email: "test@example.com" } },
      error: null,
    });
  });

  function createVerifyRequest(body: unknown): NextRequest {
    return new NextRequest("http://localhost:3000/api/payments/razorpay/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  describe("Authentication and Authorization", () => {
    it("should reject unauthenticated requests", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      const request = createVerifyRequest({
        orderId: "order_123",
        razorpayOrderId: "order_rzp_123",
        razorpayPaymentId: "pay_123",
        razorpaySignature: "sig_123",
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.error).toBe("Authentication required");
    });

    it("should reject verification for order belonging to different user", async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Not found" },
              }),
            }),
          }),
        }),
      });

      const request = createVerifyRequest({
        orderId: "order_123",
        razorpayOrderId: "order_rzp_123",
        razorpayPaymentId: "pay_123",
        razorpaySignature: "sig_123",
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.error).toBe("Order not found or access denied");
    });
  });

  describe("COD Isolation", () => {
    it("should reject verification for COD order", async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "order_123",
                  order_number: "ORD-2026-001",
                  total_paise: 50000,
                  payment_method: "cod",
                  payment_status: "pending",
                  razorpay_order_id: null,
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const request = createVerifyRequest({
        orderId: "order_123",
        razorpayOrderId: "order_rzp_123",
        razorpayPaymentId: "pay_123",
        razorpaySignature: "sig_123",
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toContain("does not support online payment");
    });
  });

  describe("Signature Validation", () => {
    it("should reject invalid payment signature", async () => {
      const orderId = "order_123";
      const razorpayOrderId = "order_rzp_123";
      const razorpayPaymentId = "pay_123";

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: orderId,
                  order_number: "ORD-2026-001",
                  total_paise: 50000,
                  payment_method: "razorpay",
                  payment_status: "initiated",
                  razorpay_order_id: razorpayOrderId,
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      mockAdminClient.rpc.mockResolvedValue({ data: null, error: null });

      const request = createVerifyRequest({
        orderId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: "invalid_signature",
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toContain("invalid signature");
      // Should record failed verification
      expect(mockAdminClient.rpc).toHaveBeenCalledWith(
        "record_payment_transaction",
        expect.objectContaining({
          p_error_code: "signature_verification_failed",
        })
      );
    });

    it("should accept valid payment signature", async () => {
      const orderId = "order_123";
      const razorpayOrderId = "order_rzp_123";
      const razorpayPaymentId = "pay_123";
      const validSignature = crypto
        .createHmac("sha256", mockEnv.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: orderId,
                  order_number: "ORD-2026-001",
                  total_paise: 50000,
                  payment_method: "razorpay",
                  payment_status: "initiated",
                  razorpay_order_id: razorpayOrderId,
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const { fetchPaymentDetails } = await import("@/lib/payments/razorpay");
      vi.mocked(fetchPaymentDetails).mockResolvedValue({
        id: razorpayPaymentId,
        entity: "payment",
        amount: 50000,
        currency: "INR",
        status: "captured",
        order_id: razorpayOrderId,
        method: "upi",
        captured: true,
        created_at: Date.now(),
      });

      mockAdminClient.rpc.mockResolvedValue({ data: null, error: null });

      const request = createVerifyRequest({
        orderId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: validSignature,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.verified).toBe(true);
    });
  });

  describe("Amount and Currency Validation", () => {
    it("should reject payment with amount mismatch", async () => {
      const orderId = "order_123";
      const razorpayOrderId = "order_rzp_123";
      const razorpayPaymentId = "pay_123";
      const validSignature = crypto
        .createHmac("sha256", mockEnv.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: orderId,
                  order_number: "ORD-2026-001",
                  total_paise: 50000,
                  payment_method: "razorpay",
                  payment_status: "initiated",
                  razorpay_order_id: razorpayOrderId,
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const { fetchPaymentDetails } = await import("@/lib/payments/razorpay");
      vi.mocked(fetchPaymentDetails).mockResolvedValue({
        id: razorpayPaymentId,
        entity: "payment",
        amount: 60000, // Different amount!
        currency: "INR",
        status: "captured",
        order_id: razorpayOrderId,
        method: "upi",
        captured: true,
        created_at: Date.now(),
      });

      const request = createVerifyRequest({
        orderId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: validSignature,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toContain("amount mismatch");
    });

    it("should reject payment with currency mismatch", async () => {
      const orderId = "order_123";
      const razorpayOrderId = "order_rzp_123";
      const razorpayPaymentId = "pay_123";
      const validSignature = crypto
        .createHmac("sha256", mockEnv.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: orderId,
                  order_number: "ORD-2026-001",
                  total_paise: 50000,
                  payment_method: "razorpay",
                  payment_status: "initiated",
                  razorpay_order_id: razorpayOrderId,
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const { fetchPaymentDetails } = await import("@/lib/payments/razorpay");
      vi.mocked(fetchPaymentDetails).mockResolvedValue({
        id: razorpayPaymentId,
        entity: "payment",
        amount: 50000,
        currency: "USD", // Wrong currency!
        status: "captured",
        order_id: razorpayOrderId,
        method: "card",
        captured: true,
        created_at: Date.now(),
      });

      const request = createVerifyRequest({
        orderId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: validSignature,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toContain("currency mismatch");
    });
  });

  describe("Idempotency", () => {
    it("should handle already completed payment idempotently", async () => {
      const orderId = "order_123";
      const razorpayOrderId = "order_rzp_123";
      const razorpayPaymentId = "pay_123";
      const validSignature = crypto
        .createHmac("sha256", mockEnv.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: orderId,
                  order_number: "ORD-2026-001",
                  total_paise: 50000,
                  payment_method: "razorpay",
                  payment_status: "completed", // Already completed
                  razorpay_order_id: razorpayOrderId,
                  status: "confirmed",
                },
                error: null,
              }),
            }),
          }),
        }),
      });

      const request = createVerifyRequest({
        orderId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: validSignature,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.verified).toBe(true);
      expect(result.paymentStatus).toBe("completed");
    });
  });
});
