/**
 * Razorpay Webhook Handler Tests
 * Tests for webhook signature validation, error handling, deduplication, and COD isolation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { NextRequest } from "next/server";
import crypto from "crypto";

// Mock environment variables
const mockEnv = {
  RAZORPAY_WEBHOOK_SECRET: "test_webhook_secret_12345",
};

// Mock Supabase admin client
const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
};

// Mock modules
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockSupabase,
}));

vi.mock("@/lib/payments/razorpay", () => ({
  verifyWebhookSignature: (rawBody: string, signature: string) => {
    const expectedSignature = crypto
      .createHmac("sha256", mockEnv.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");
    return signature === expectedSignature;
  },
}));

describe("Razorpay Webhook Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", mockEnv.RAZORPAY_WEBHOOK_SECRET);
  });

  function createWebhookRequest(payload: unknown, generateValidSignature = true): NextRequest {
    const rawBody = JSON.stringify(payload);
    const signature = generateValidSignature
      ? crypto.createHmac("sha256", mockEnv.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex")
      : "invalid_signature_12345";

    const headers = new Headers({
      "x-razorpay-signature": signature,
      "content-type": "application/json",
    });

    return new NextRequest("http://localhost:3000/api/webhooks/razorpay", {
      method: "POST",
      headers,
      body: rawBody,
    });
  }

  describe("Signature Validation", () => {
    it("should reject webhook with missing signature", async () => {
      const payload = { event: "payment.captured", created_at: Date.now() };
      const rawBody = JSON.stringify(payload);

      const request = new NextRequest("http://localhost:3000/api/webhooks/razorpay", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: rawBody,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe("Missing signature");
    });

    it("should reject webhook with invalid signature", async () => {
      const payload = {
        event: "payment.captured",
        created_at: Date.now(),
        payload: {
          payment: {
            entity: {
              id: "pay_test123",
              order_id: "order_test123",
              amount: 50000,
              currency: "INR",
              status: "captured",
              method: "upi",
            },
          },
        },
      };

      const request = createWebhookRequest(payload, false);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.error).toBe("Invalid signature");
    });

    it("should accept webhook with valid signature", async () => {
      const payload = {
        event: "payment.captured",
        created_at: Date.now(),
        payload: {
          payment: {
            entity: {
              id: "pay_test123",
              order_id: "order_test456",
              amount: 50000,
              currency: "INR",
              status: "captured",
              method: "upi",
            },
          },
        },
      };

      // Mock database responses
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: "order_uuid",
                order_number: "ORD-2026-001",
                total_paise: 50000,
                payment_method: "razorpay",
                payment_status: "initiated",
              },
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      const request = createWebhookRequest(payload, true);
      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe("Payment Captured Event", () => {
    const validPayload = {
      event: "payment.captured",
      created_at: 1698765432,
      payload: {
        payment: {
          entity: {
            id: "pay_test123",
            order_id: "order_test456",
            amount: 50000,
            currency: "INR",
            status: "captured",
            method: "upi",
            captured: true,
          },
        },
      },
    };

    it("should reject payment for order not found", async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Order not found" },
            }),
          }),
        }),
      });

      const request = createWebhookRequest(validPayload, true);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(404);
      expect(result.error).toBe("Order not found");
    });

    it("should reject payment for COD order", async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: "order_uuid",
                order_number: "ORD-2026-001",
                total_paise: 50000,
                payment_method: "cod", // COD order
                payment_status: "pending",
              },
              error: null,
            }),
          }),
        }),
      });

      const request = createWebhookRequest(validPayload, true);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe("Payment method mismatch");
    });

    it("should reject payment with amount mismatch", async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: "order_uuid",
                order_number: "ORD-2026-001",
                total_paise: 60000, // Different from webhook amount
                payment_method: "razorpay",
                payment_status: "initiated",
              },
              error: null,
            }),
          }),
        }),
      });

      const request = createWebhookRequest(validPayload, true);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe("Amount mismatch");
    });

    it("should reject payment with currency mismatch", async () => {
      const payloadWithWrongCurrency = {
        ...validPayload,
        payload: {
          payment: {
            entity: {
              ...validPayload.payload.payment.entity,
              currency: "USD", // Wrong currency
            },
          },
        },
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: "order_uuid",
                order_number: "ORD-2026-001",
                total_paise: 50000,
                payment_method: "razorpay",
                payment_status: "initiated",
              },
              error: null,
            }),
          }),
        }),
      });

      const request = createWebhookRequest(payloadWithWrongCurrency, true);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe("Currency mismatch");
    });

    it("should return 500 if transaction recording fails", async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: "order_uuid",
                order_number: "ORD-2026-001",
                total_paise: 50000,
                payment_method: "razorpay",
                payment_status: "initiated",
              },
              error: null,
            }),
          }),
        }),
      });

      // Mock transaction recording failure (not duplicate)
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { code: "database_error", message: "Database connection failed" },
      });

      const request = createWebhookRequest(validPayload, true);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toBe("Failed to record transaction");
    });

    it("should handle duplicate webhook events idempotently", async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: "order_uuid",
                order_number: "ORD-2026-001",
                total_paise: 50000,
                payment_method: "razorpay",
                payment_status: "completed", // Already processed
              },
              error: null,
            }),
          }),
        }),
      });

      // Mock duplicate constraint violation
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { code: "23505", message: "Duplicate key violation" },
      });

      const request = createWebhookRequest(validPayload, true);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.duplicate).toBe(true);
    });

    it("should successfully process valid payment.captured", async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: "order_uuid",
                order_number: "ORD-2026-001",
                total_paise: 50000,
                payment_method: "razorpay",
                payment_status: "initiated",
              },
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      const request = createWebhookRequest(validPayload, true);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.received).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith("record_payment_transaction", expect.any(Object));
      expect(mockSupabase.rpc).toHaveBeenCalledWith("update_payment_status_atomic", expect.any(Object));
    });
  });

  describe("Payment Failed Event", () => {
    const failedPayload = {
      event: "payment.failed",
      created_at: 1698765432,
      payload: {
        payment: {
          entity: {
            id: "pay_failed123",
            order_id: "order_test456",
            amount: 50000,
            currency: "INR",
            status: "failed",
            method: "card",
            error_code: "BAD_REQUEST_ERROR",
            error_description: "Payment failed due to insufficient funds",
          },
        },
      },
    };

    it("should reject failed payment for COD order", async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: "order_uuid",
                order_number: "ORD-2026-001",
                total_paise: 50000,
                payment_method: "cod",
                payment_status: "pending",
              },
              error: null,
            }),
          }),
        }),
      });

      const request = createWebhookRequest(failedPayload, true);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe("Payment method mismatch");
    });

    it("should successfully process payment.failed", async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: "order_uuid",
                order_number: "ORD-2026-001",
                total_paise: 50000,
                payment_method: "razorpay",
                payment_status: "initiated",
              },
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      const request = createWebhookRequest(failedPayload, true);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.received).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        "record_payment_transaction",
        expect.objectContaining({
          p_status: "failed",
          p_error_code: "BAD_REQUEST_ERROR",
        })
      );
    });

    it("should not regress completed payment status", async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: "order_uuid",
                order_number: "ORD-2026-001",
                total_paise: 50000,
                payment_method: "razorpay",
                payment_status: "completed", // Already completed
              },
              error: null,
            }),
          }),
        }),
      });

      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      const request = createWebhookRequest(failedPayload, true);
      const response = await POST(request);

      expect(response.status).toBe(200);
      // Should not call update_payment_status_atomic for completed orders
      expect(mockSupabase.rpc).toHaveBeenCalledWith("record_payment_transaction", expect.any(Object));
    });
  });

  describe("Order Paid Event", () => {
    const orderPaidPayload = {
      event: "order.paid",
      created_at: 1698765432,
      payload: {
        order: {
          entity: {
            id: "order_test456",
            amount: 50000,
            amount_paid: 50000,
            amount_due: 0,
            currency: "INR",
            receipt: "ORD-2026-001",
            status: "paid",
          },
        },
      },
    };

    it("should reject order.paid for COD order", async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: "order_uuid",
                order_number: "ORD-2026-001",
                total_paise: 50000,
                payment_method: "cod",
                payment_status: "pending",
              },
              error: null,
            }),
          }),
        }),
      });

      const request = createWebhookRequest(orderPaidPayload, true);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe("Payment method mismatch");
    });

    it("should handle already processed order.paid idempotently", async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: "order_uuid",
                order_number: "ORD-2026-001",
                total_paise: 50000,
                payment_method: "razorpay",
                payment_status: "completed",
              },
              error: null,
            }),
          }),
        }),
      });

      const request = createWebhookRequest(orderPaidPayload, true);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.already_processed).toBe(true);
    });
  });

  describe("Malformed Payloads", () => {
    it("should handle JSON parsing errors", async () => {
      const invalidJSON = "{ this is not valid json }";
      const signature = crypto
        .createHmac("sha256", mockEnv.RAZORPAY_WEBHOOK_SECRET)
        .update(invalidJSON)
        .digest("hex");

      const request = new NextRequest("http://localhost:3000/api/webhooks/razorpay", {
        method: "POST",
        headers: {
          "x-razorpay-signature": signature,
          "content-type": "application/json",
        },
        body: invalidJSON,
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe("Invalid webhook payload");
    });

    it("should handle unrecognized event types gracefully", async () => {
      const payload = {
        event: "unknown.event.type",
        created_at: Date.now(),
        payload: {},
      };

      const request = createWebhookRequest(payload, true);
      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });
});
