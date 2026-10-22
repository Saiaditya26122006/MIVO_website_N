/**
 * Razorpay Payment Gateway Integration
 * Server-side utilities for payment processing
 */

import Razorpay from "razorpay";
import crypto from "crypto";

// Validate environment variables
function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Create Razorpay instance
 * Only use on server-side
 */
export function createRazorpayInstance(): Razorpay {
  try {
    const keyId = getEnvVar("RAZORPAY_KEY_ID");
    const keySecret = getEnvVar("RAZORPAY_KEY_SECRET");

    return new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  } catch (error) {
    console.error("[Razorpay] Failed to create instance:", error);
    throw new Error("Payment gateway configuration error");
  }
}

/**
 * Verify Razorpay payment signature
 * Used for checkout callback verification
 */
export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean {
  try {
    const keySecret = getEnvVar("RAZORPAY_KEY_SECRET");

    // Generate expected signature
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    // Timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(generatedSignature, "utf8"),
      Buffer.from(razorpaySignature, "utf8")
    );
  } catch (error) {
    console.error("[Razorpay] Signature verification error:", error);
    return false;
  }
}

/**
 * Verify Razorpay webhook signature
 * Must use raw request body (before JSON parsing)
 */
export function verifyWebhookSignature(
  rawBody: string,
  receivedSignature: string
): boolean {
  try {
    const webhookSecret = getEnvVar("RAZORPAY_WEBHOOK_SECRET");

    // Generate expected signature
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    // Timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "utf8"),
      Buffer.from(receivedSignature, "utf8")
    );
  } catch (error) {
    console.error("[Razorpay] Webhook signature verification error:", error);
    return false;
  }
}

/**
 * Create a Razorpay order
 */
export interface CreateRazorpayOrderParams {
  amountPaise: number;
  currency?: string;
  receiptId: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
}

export async function createRazorpayOrder(
  params: CreateRazorpayOrderParams
): Promise<RazorpayOrderResponse> {
  const razorpay = createRazorpayInstance();

  try {
    const order = await razorpay.orders.create({
      amount: params.amountPaise,
      currency: params.currency || "INR",
      receipt: params.receiptId,
      notes: params.notes || {},
    });

    return order as RazorpayOrderResponse;
  } catch (error) {
    console.error("[Razorpay] Order creation failed:", error);
    throw new Error("Failed to create payment order");
  }
}

/**
 * Fetch payment details from Razorpay
 */
export interface RazorpayPaymentResponse {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: string;
  order_id: string;
  method: string;
  captured: boolean;
  email?: string;
  contact?: string;
  error_code?: string;
  error_description?: string;
  created_at: number;
}

export async function fetchPaymentDetails(
  paymentId: string
): Promise<RazorpayPaymentResponse> {
  const razorpay = createRazorpayInstance();

  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment as RazorpayPaymentResponse;
  } catch (error) {
    console.error("[Razorpay] Payment fetch failed:", error);
    throw new Error("Failed to fetch payment details");
  }
}

/**
 * Get public Razorpay key ID for client-side checkout
 */
export function getPublicKeyId(): string {
  return getEnvVar("RAZORPAY_KEY_ID");
}
