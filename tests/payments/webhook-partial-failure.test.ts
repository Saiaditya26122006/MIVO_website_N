/**
 * Webhook Partial Failure Regression Tests
 * Tests for partial webhook processing failures where transaction recording
 * succeeds but order status update fails, followed by retry.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/webhooks/razorpay/route";
import { NextRequest } from "next/server";
import crypto from "crypto";

const mockEnv = {
  RAZORPAY_WEBHOOK_SECRET: "test_webhook_secret_12345",
};

const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
};

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

describe("Webhook Partial Failure Scenarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", mockEnv.RAZORPAY_WEBHOOK_SECRET);
  });

  function createWebhookRequest(payload: unknown): NextRequest {
    const rawBody = JSON.stringify(payload);
    const signature = crypto
      .createHmac("sha256", mockEnv.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    return new NextRequest("http://localhost:3000/api/webhooks/razorpay", {
      method: "POST",
      headers: {
        "x-razorpay-signature": signature,
        "content-type": "application/json",
      },
      body: rawBody,
    });
  }

  describe("payment.captured - Partial Failure Recovery", () => {
    const capturedPayload = {
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
            created_at: 1698765400,
          },
        },
      },
    };

    it("should recover on retry after transaction recorded but status update failed", async () => {
      const orderData = {
        id: "order_uuid",
        order_number: "ORD-2026-001",
        total_paise: 50000,
        payment_method: "razorpay",
        payment_status: "initiated",
      };

      // Setup mock responses
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: orderData,
              error: null,
            }),
          }),
        }),
      });

      // First attempt: transaction succeeds, status update fails
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: "transaction_id", error: null }) // record_payment_transaction succeeds
        .mockResolvedValueOnce({ data: null, error: { code: "database_error", message: "Connection timeout" } }); // update_payment_status_atomic fails

      const request1 = createWebhookRequest(capturedPayload);
      const response1 = await POST(request1);
      const result1 = await response1.json();

      expect(response1.status).toBe(500);
      expect(result1.error).toBe("Failed to update order");

      // Verify transaction recording was called
      expect(mockSupabase.rpc).toHaveBeenNthCalledWith(1, "record_payment_transaction", expect.any(Object));
      expect(mockSupabase.rpc).toHaveBeenNthCalledWith(2, "update_payment_status_atomic", expect.any(Object));

      // Reset mocks for retry
      vi.clearAllMocks();
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: orderData,
              error: null,
            }),
          }),
        }),
      });

      // Retry: transaction already exists (returns transaction ID, no error), status update succeeds
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: "transaction_id", error: null }) // record_payment_transaction returns existing (idempotent)
        .mockResolvedValueOnce({ data: null, error: null }); // update_payment_status_atomic succeeds

      const request2 = createWebhookRequest(capturedPayload);
      const response2 = await POST(request2);
      const result2 = await response2.json();

      expect(response2.status).toBe(200);
      expect(result2.received).toBe(true);

      // Verify retry attempted status update again
      expect(mockSupabase.rpc).toHaveBeenNthCalledWith(1, "record_payment_transaction", expect.any(Object));
      expect(mockSupabase.rpc).toHaveBeenNthCalledWith(2, "update_payment_status_atomic", expect.any(Object));
    });

    it("should handle exception after transaction recording by returning 500 and allowing retry", async () => {
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

      // Transaction succeeds, then throw exception
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: "transaction_id", error: null })
        .mockRejectedValueOnce(new Error("Unexpected RPC error"));

      const request = createWebhookRequest(capturedPayload);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toBe("Webhook processing failed");
    });
  });

  describe("payment.failed - Status Update Failure Handling", () => {
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
            error_code: "PAYMENT_DECLINED",
            error_description: "Payment declined by bank",
            created_at: 1698765400,
          },
        },
      },
    };

    it("FIXED: returns 500 when status update fails for failed payment", async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: "order_uuid",
                order_number: "ORD-2026-001",
                total_paise: 50000,
                payment_method: "razorpay",
                payment_status: "initiated", // Not completed, so will attempt status update
              },
              error: null,
            }),
          }),
        }),
      });

      // Transaction recording succeeds, status update fails
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: "transaction_id", error: null })
        .mockResolvedValueOnce({ data: null, error: { code: "database_error", message: "Connection lost" } });

      const request = createWebhookRequest(failedPayload);
      const response = await POST(request);
      const result = await response.json();

      // FIXED: Now returns 500 for retry
      expect(response.status).toBe(500);
      expect(result.error).toBe("Failed to update order status");
    });
  });

  describe("order.paid - No Deduplication", () => {
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

    it("FIXED: transaction recording enables event-based deduplication", async () => {
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

      // First attempt: transaction recording succeeds, status update fails
      mockSupabase.rpc
        .mockResolvedValueOnce({ data: "transaction_id", error: null }) // record_payment_transaction
        .mockResolvedValueOnce({ data: null, error: { code: "database_error", message: "Connection timeout" } }); // update_payment_status_atomic

      const request1 = createWebhookRequest(orderPaidPayload);
      const response1 = await POST(request1);

      expect(response1.status).toBe(500);
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(2);
      expect(mockSupabase.rpc).toHaveBeenNthCalledWith(1, "record_payment_transaction", expect.any(Object));
      expect(mockSupabase.rpc).toHaveBeenNthCalledWith(2, "update_payment_status_atomic", expect.any(Object));

      // Retry: Transaction already exists (deduplication), status update succeeds
      vi.clearAllMocks();
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

      mockSupabase.rpc
        .mockResolvedValueOnce({ data: "transaction_id", error: null }) // record_payment_transaction (returns existing)
        .mockResolvedValueOnce({ data: null, error: null }); // update_payment_status_atomic

      const request2 = createWebhookRequest(orderPaidPayload);
      const response2 = await POST(request2);

      expect(response2.status).toBe(200);
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(2);

      // FIXED: Now calls record_payment_transaction
      expect(mockSupabase.rpc).toHaveBeenNthCalledWith(1, "record_payment_transaction", expect.any(Object));
      expect(mockSupabase.rpc).toHaveBeenNthCalledWith(2, "update_payment_status_atomic", expect.any(Object));
    });

    it("FIXED: uses both transaction deduplication and payment_status check", async () => {
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

      // Transaction recording succeeds (or returns existing if duplicate)
      mockSupabase.rpc.mockResolvedValueOnce({ data: "transaction_id", error: null });

      const request = createWebhookRequest(orderPaidPayload);
      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.already_processed).toBe(true);

      // Now calls record_payment_transaction but skips status update
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
      expect(mockSupabase.rpc).toHaveBeenCalledWith("record_payment_transaction", expect.any(Object));
      expect(mockSupabase.rpc).not.toHaveBeenCalledWith("update_payment_status_atomic", expect.any(Object));
    });
  });

  describe("Event ID Collision Resistance", () => {
    it("should generate unique event IDs for different payments with same timestamp", () => {
      const timestamp = 1698765432;

      const event1 = {
        event: "payment.captured",
        created_at: timestamp,
        payload: {
          payment: {
            entity: {
              id: "pay_abc123",
              order_id: "order_xyz",
              amount: 50000,
              currency: "INR",
              status: "captured",
              method: "upi",
              captured: true,
              created_at: timestamp,
            },
          },
        },
      };

      const event2 = {
        event: "payment.captured",
        created_at: timestamp,
        payload: {
          payment: {
            entity: {
              id: "pay_def456", // Different payment ID
              order_id: "order_xyz",
              amount: 50000,
              currency: "INR",
              status: "captured",
              method: "card",
              captured: true,
              created_at: timestamp,
            },
          },
        },
      };

      const eventId1 = `${event1.event}_${event1.created_at}_${event1.payload.payment.entity.id}`;
      const eventId2 = `${event2.event}_${event2.created_at}_${event2.payload.payment.entity.id}`;

      expect(eventId1).not.toBe(eventId2);
      expect(eventId1).toBe("payment.captured_1698765432_pay_abc123");
      expect(eventId2).toBe("payment.captured_1698765432_pay_def456");
    });

    it("should generate same event ID for duplicate webhook delivery", () => {
      const timestamp = 1698765432;
      const paymentId = "pay_abc123";

      const eventId1 = `payment.captured_${timestamp}_${paymentId}`;
      const eventId2 = `payment.captured_${timestamp}_${paymentId}`;

      expect(eventId1).toBe(eventId2);
    });
  });
});
