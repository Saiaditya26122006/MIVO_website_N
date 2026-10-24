import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";

interface RazorpayWebhookEvent {
  entity: string;
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    payment: {
      entity: {
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
      };
    };
    order?: {
      entity: {
        id: string;
        amount: number;
        amount_paid: number;
        amount_due: number;
        currency: string;
        receipt: string;
        status: string;
      };
    };
  };
  created_at: number;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const receivedSignature = request.headers.get("x-razorpay-signature");

    if (!receivedSignature) {
      console.error("[Razorpay Webhook] Missing signature header");
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const isValid = verifyWebhookSignature(rawBody, receivedSignature);

    if (!isValid) {
      console.error("[Razorpay Webhook] Invalid signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Parse webhook event
    const event: RazorpayWebhookEvent = JSON.parse(rawBody);
    const eventType = event.event;

    console.warn("[Razorpay Webhook] Received event:", eventType);

    // Create service role client for database operations (webhooks have no user context)
    const supabase = createAdminClient();

    // Generate webhook event ID for deduplication
    // Format: {event_type}_{timestamp}_{payment_or_order_id}
    // Uses payment ID if available (most reliable), otherwise order ID
    const entityId = event.payload.payment?.entity?.id || event.payload.order?.entity?.id || "unknown";
    const webhookEventId = `${event.event}_${event.created_at}_${entityId}`;

    // Handle different event types
    switch (eventType) {
      case "payment.captured":
        return await handlePaymentCaptured(supabase, event, webhookEventId);

      case "payment.failed":
        return await handlePaymentFailed(supabase, event, webhookEventId);

      case "order.paid":
        return await handleOrderPaid(supabase, event, webhookEventId);

      default:
        console.warn("[Razorpay Webhook] Unhandled event type:", eventType);
        return NextResponse.json({ received: true }, { status: 200 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Razorpay Webhook] Error processing webhook:", message);

    // Return appropriate status based on error type
    // 400 for parsing errors (don't retry), 500 for transient failures (retry)
    if (error instanceof SyntaxError) {
      // JSON parsing failed - don't retry
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 }
      );
    }

    // Database or network errors - return 500 so Razorpay retries
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handlePaymentCaptured(
  supabase: ReturnType<typeof createAdminClient>,
  event: RazorpayWebhookEvent,
  webhookEventId: string
): Promise<NextResponse> {
  const payment = event.payload.payment.entity;

  console.warn("[Razorpay Webhook] Processing payment.captured:", payment.id);

  // Find order by Razorpay order ID
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("razorpay_order_id", payment.order_id)
    .single();

  if (orderError || !order) {
    console.error(
      "[Razorpay Webhook] Order not found for Razorpay order:",
      payment.order_id,
      orderError?.message
    );
    return NextResponse.json(
      { error: "Order not found" },
      { status: 404 }
    );
  }

  // CRITICAL: Verify this is not a COD order
  if (order.payment_method === "cod") {
    console.error(
      "[Razorpay Webhook] Rejected Razorpay payment for COD order:",
      order.order_number
    );
    return NextResponse.json(
      { error: "Payment method mismatch" },
      { status: 400 }
    );
  }

  // Verify amount matches
  if (payment.amount !== order.total_paise) {
    console.error(
      "[Razorpay Webhook] Amount mismatch:",
      `expected=${order.total_paise}`,
      `received=${payment.amount}`
    );
    return NextResponse.json(
      { error: "Amount mismatch" },
      { status: 400 }
    );
  }

  // Verify currency
  if (payment.currency !== "INR") {
    console.error(
      "[Razorpay Webhook] Currency mismatch:",
      `expected=INR`,
      `received=${payment.currency}`
    );
    return NextResponse.json(
      { error: "Currency mismatch" },
      { status: 400 }
    );
  }

  // Record transaction (will be deduplicated if already processed)
  const { error: transactionError } = await supabase.rpc("record_payment_transaction", {
    p_order_id: order.id,
    p_razorpay_order_id: payment.order_id,
    p_razorpay_payment_id: payment.id,
    p_event_type: "payment.captured",
    p_amount_paise: payment.amount,
    p_currency: payment.currency,
    p_status: payment.status,
    p_method: payment.method,
    p_webhook_event_id: webhookEventId,
    p_webhook_signature_verified: true,
    p_raw_response: event.payload.payment.entity,
  });

  if (transactionError) {
    // Check if this is a duplicate event (unique constraint violation)
    if (transactionError.code === "23505") {
      console.warn("[Razorpay Webhook] Duplicate event ignored:", webhookEventId);
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }

    // CRITICAL FIX: Transaction recording failed - return 500 so Razorpay retries
    console.error("[Razorpay Webhook] Failed to record transaction:", transactionError);
    return NextResponse.json(
      { error: "Failed to record transaction" },
      { status: 500 }
    );
  }

  // Update order status
  const { error: updateError } = await supabase.rpc("update_payment_status_atomic", {
    p_order_id: order.id,
    p_razorpay_order_id: payment.order_id,
    p_razorpay_payment_id: payment.id,
    p_payment_method: "razorpay",
    p_new_payment_status: "completed",
    p_new_order_status: "confirmed",
    p_expected_amount_paise: order.total_paise,
  });

  if (updateError) {
    console.error("[Razorpay Webhook] Failed to update order status:", updateError);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }

  console.warn("[Razorpay Webhook] Successfully processed payment.captured for order:", order.order_number);

  return NextResponse.json({ received: true }, { status: 200 });
}

async function handlePaymentFailed(
  supabase: ReturnType<typeof createAdminClient>,
  event: RazorpayWebhookEvent,
  webhookEventId: string
): Promise<NextResponse> {
  const payment = event.payload.payment.entity;

  console.warn("[Razorpay Webhook] Processing payment.failed:", payment.id);

  // Find order by Razorpay order ID
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("razorpay_order_id", payment.order_id)
    .single();

  if (orderError || !order) {
    console.error(
      "[Razorpay Webhook] Order not found for Razorpay order:",
      payment.order_id,
      orderError?.message
    );
    return NextResponse.json(
      { error: "Order not found" },
      { status: 404 }
    );
  }

  // CRITICAL: Verify this is not a COD order
  if (order.payment_method === "cod") {
    console.error(
      "[Razorpay Webhook] Rejected Razorpay payment event for COD order:",
      order.order_number
    );
    return NextResponse.json(
      { error: "Payment method mismatch" },
      { status: 400 }
    );
  }

  // Record failed transaction
  const { error: transactionError } = await supabase.rpc("record_payment_transaction", {
    p_order_id: order.id,
    p_razorpay_order_id: payment.order_id,
    p_razorpay_payment_id: payment.id,
    p_event_type: "payment.failed",
    p_amount_paise: payment.amount,
    p_currency: payment.currency,
    p_status: "failed",
    p_method: payment.method,
    p_webhook_event_id: webhookEventId,
    p_webhook_signature_verified: true,
    p_error_code: payment.error_code,
    p_error_description: payment.error_description,
    p_raw_response: event.payload.payment.entity,
  });

  if (transactionError) {
    // Check if this is a duplicate event
    if (transactionError.code === "23505") {
      console.warn("[Razorpay Webhook] Duplicate event ignored:", webhookEventId);
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }

    // CRITICAL FIX: Transaction recording failed - return 500 so Razorpay retries
    console.error("[Razorpay Webhook] Failed to record transaction:", transactionError);
    return NextResponse.json(
      { error: "Failed to record transaction" },
      { status: 500 }
    );
  }

  // Only update to payment_failed if payment is not already completed
  if (order.payment_status !== "completed") {
    const { error: updateError } = await supabase.rpc("update_payment_status_atomic", {
      p_order_id: order.id,
      p_razorpay_order_id: payment.order_id,
      p_razorpay_payment_id: payment.id,
      p_payment_method: "razorpay",
      p_new_payment_status: "failed",
      p_new_order_status: "payment_failed",
      p_expected_amount_paise: order.total_paise,
    });

    if (updateError) {
      console.error("[Razorpay Webhook] Failed to update order status:", updateError);
      // Non-critical: Failed payment already recorded, status update failure is recoverable
      // Return 200 because the transaction record is the source of truth
    }
  }

  console.warn("[Razorpay Webhook] Successfully processed payment.failed for order:", order.order_number);

  return NextResponse.json({ received: true }, { status: 200 });
}

async function handleOrderPaid(
  supabase: ReturnType<typeof createAdminClient>,
  event: RazorpayWebhookEvent,
  _webhookEventId: string
): Promise<NextResponse> {
  const razorpayOrder = event.payload.order?.entity;

  if (!razorpayOrder) {
    console.error("[Razorpay Webhook] Missing order entity in order.paid event");
    return NextResponse.json(
      { error: "Invalid event payload" },
      { status: 400 }
    );
  }

  console.warn("[Razorpay Webhook] Processing order.paid:", razorpayOrder.id);

  // Find order by Razorpay order ID
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("razorpay_order_id", razorpayOrder.id)
    .single();

  if (orderError || !order) {
    console.error(
      "[Razorpay Webhook] Order not found for Razorpay order:",
      razorpayOrder.id,
      orderError?.message
    );
    return NextResponse.json(
      { error: "Order not found" },
      { status: 404 }
    );
  }

  // CRITICAL: Verify this is not a COD order
  if (order.payment_method === "cod") {
    console.error(
      "[Razorpay Webhook] Rejected Razorpay order.paid for COD order:",
      order.order_number
    );
    return NextResponse.json(
      { error: "Payment method mismatch" },
      { status: 400 }
    );
  }

  // Verify amount matches
  if (razorpayOrder.amount !== order.total_paise) {
    console.error(
      "[Razorpay Webhook] Amount mismatch:",
      `expected=${order.total_paise}`,
      `received=${razorpayOrder.amount}`
    );
    return NextResponse.json(
      { error: "Amount mismatch" },
      { status: 400 }
    );
  }

  // If already marked as completed, skip
  if (order.payment_status === "completed") {
    console.warn("[Razorpay Webhook] Order already marked as paid:", order.order_number);
    return NextResponse.json({ received: true, already_processed: true }, { status: 200 });
  }

  // Update order status
  const { error: updateError } = await supabase.rpc("update_payment_status_atomic", {
    p_order_id: order.id,
    p_razorpay_order_id: razorpayOrder.id,
    p_razorpay_payment_id: null,
    p_payment_method: "razorpay",
    p_new_payment_status: "completed",
    p_new_order_status: "confirmed",
    p_expected_amount_paise: order.total_paise,
  });

  if (updateError) {
    console.error("[Razorpay Webhook] Failed to update order status:", updateError);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }

  console.warn("[Razorpay Webhook] Successfully processed order.paid for order:", order.order_number);

  return NextResponse.json({ received: true }, { status: 200 });
}
