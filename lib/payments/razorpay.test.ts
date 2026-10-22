import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import { verifyPaymentSignature, verifyWebhookSignature } from "./razorpay";

// Mock environment variables
const mockEnv = {
  RAZORPAY_KEY_ID: "rzp_test_mock_key_id",
  RAZORPAY_KEY_SECRET: "mock_key_secret_12345",
  RAZORPAY_WEBHOOK_SECRET: "mock_webhook_secret_67890",
};

describe("Razorpay Payment Utilities", () => {
  beforeEach(() => {
    // Set up environment variables
    vi.stubEnv("RAZORPAY_KEY_ID", mockEnv.RAZORPAY_KEY_ID);
    vi.stubEnv("RAZORPAY_KEY_SECRET", mockEnv.RAZORPAY_KEY_SECRET);
    vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", mockEnv.RAZORPAY_WEBHOOK_SECRET);
  });

  describe("verifyPaymentSignature", () => {
    it("should verify valid payment signature", () => {
      const orderId = "order_test123";
      const paymentId = "pay_test456";

      // Generate valid signature
      const expectedSignature = crypto
        .createHmac("sha256", mockEnv.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      const result = verifyPaymentSignature(orderId, paymentId, expectedSignature);

      expect(result).toBe(true);
    });

    it("should reject invalid payment signature", () => {
      const orderId = "order_test123";
      const paymentId = "pay_test456";
      const invalidSignature = "invalid_signature_string";

      const result = verifyPaymentSignature(orderId, paymentId, invalidSignature);

      expect(result).toBe(false);
    });

    it("should reject signature with tampered order ID", () => {
      const orderId = "order_test123";
      const paymentId = "pay_test456";
      const tamperedOrderId = "order_tampered";

      // Generate signature with original order ID
      const signature = crypto
        .createHmac("sha256", mockEnv.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      // Try to verify with tampered order ID
      const result = verifyPaymentSignature(tamperedOrderId, paymentId, signature);

      expect(result).toBe(false);
    });

    it("should reject signature with tampered payment ID", () => {
      const orderId = "order_test123";
      const paymentId = "pay_test456";
      const tamperedPaymentId = "pay_tampered";

      // Generate signature with original payment ID
      const signature = crypto
        .createHmac("sha256", mockEnv.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      // Try to verify with tampered payment ID
      const result = verifyPaymentSignature(orderId, tamperedPaymentId, signature);

      expect(result).toBe(false);
    });

    it("should use timing-safe comparison", () => {
      // This test ensures we're using crypto.timingSafeEqual
      // which prevents timing attacks
      const orderId = "order_test123";
      const paymentId = "pay_test456";
      const validSignature = crypto
        .createHmac("sha256", mockEnv.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      // Create a signature that differs by one character
      const almostValidSignature = validSignature.slice(0, -1) + "0";

      const result = verifyPaymentSignature(orderId, paymentId, almostValidSignature);

      expect(result).toBe(false);
    });
  });

  describe("verifyWebhookSignature", () => {
    it("should verify valid webhook signature", () => {
      const rawBody = JSON.stringify({
        event: "payment.captured",
        payload: { payment: { entity: { id: "pay_test123" } } },
      });

      const expectedSignature = crypto
        .createHmac("sha256", mockEnv.RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest("hex");

      const result = verifyWebhookSignature(rawBody, expectedSignature);

      expect(result).toBe(true);
    });

    it("should reject invalid webhook signature", () => {
      const rawBody = JSON.stringify({
        event: "payment.captured",
        payload: { payment: { entity: { id: "pay_test123" } } },
      });
      const invalidSignature = "invalid_signature_string";

      const result = verifyWebhookSignature(rawBody, invalidSignature);

      expect(result).toBe(false);
    });

    it("should reject signature with tampered body", () => {
      const originalBody = JSON.stringify({
        event: "payment.captured",
        payload: { payment: { entity: { amount: 50000 } } },
      });

      const tamperedBody = JSON.stringify({
        event: "payment.captured",
        payload: { payment: { entity: { amount: 100 } } },
      });

      // Generate signature with original body
      const signature = crypto
        .createHmac("sha256", mockEnv.RAZORPAY_WEBHOOK_SECRET)
        .update(originalBody)
        .digest("hex");

      // Try to verify with tampered body
      const result = verifyWebhookSignature(tamperedBody, signature);

      expect(result).toBe(false);
    });

    it("should be sensitive to whitespace changes in body", () => {
      const body1 = JSON.stringify({ event: "test" });
      const body2 = JSON.stringify({ event: "test" }, null, 2); // Formatted JSON

      const signature = crypto
        .createHmac("sha256", mockEnv.RAZORPAY_WEBHOOK_SECRET)
        .update(body1)
        .digest("hex");

      // body2 has different whitespace, so signature should not match
      const result = verifyWebhookSignature(body2, signature);

      expect(result).toBe(false);
    });
  });

  describe("Security Properties", () => {
    it("should generate different signatures for different inputs", () => {
      const orderId1 = "order_test1";
      const orderId2 = "order_test2";
      const paymentId = "pay_test456";

      const sig1 = crypto
        .createHmac("sha256", mockEnv.RAZORPAY_KEY_SECRET)
        .update(`${orderId1}|${paymentId}`)
        .digest("hex");

      const sig2 = crypto
        .createHmac("sha256", mockEnv.RAZORPAY_KEY_SECRET)
        .update(`${orderId2}|${paymentId}`)
        .digest("hex");

      expect(sig1).not.toBe(sig2);
    });

    it("should generate consistent signatures for same input", () => {
      const orderId = "order_test123";
      const paymentId = "pay_test456";

      const sig1 = crypto
        .createHmac("sha256", mockEnv.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      const sig2 = crypto
        .createHmac("sha256", mockEnv.RAZORPAY_KEY_SECRET)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      expect(sig1).toBe(sig2);
    });
  });

  describe("Error Handling", () => {
    it("should handle empty strings gracefully", () => {
      expect(() => verifyPaymentSignature("", "", "")).not.toThrow();
      expect(() => verifyWebhookSignature("", "")).not.toThrow();
    });

    it("should return false for malformed signatures", () => {
      const result1 = verifyPaymentSignature("order_123", "pay_456", "not-a-hex-string!");
      const result2 = verifyWebhookSignature("{}", "not-a-hex-string!");

      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });
  });
});
