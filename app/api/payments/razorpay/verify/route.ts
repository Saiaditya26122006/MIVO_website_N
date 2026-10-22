import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyPaymentSignature, fetchPaymentDetails } from "@/lib/payments/razorpay";

interface VerifyPaymentRequest {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

interface VerifyPaymentResponse {
  success: boolean;
  error?: string;
  verified?: boolean;
  paymentStatus?: string;
  orderStatus?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<VerifyPaymentResponse>> {
  try {
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body: VerifyPaymentRequest = await request.json();
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { success: false, error: "Missing required payment verification parameters" },
        { status: 400 }
      );
    }

    // Fetch the order and verify ownership
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("customer_id", user.id)
      .single();

    if (orderError || !order) {
      console.error("[Razorpay Verify] Order not found:", orderId, orderError?.message);
      return NextResponse.json(
        { success: false, error: "Order not found or access denied" },
        { status: 404 }
      );
    }

    // Verify the order is associated with this Razorpay order ID
    if (order.razorpay_order_id !== razorpayOrderId) {
      console.error(
        "[Razorpay Verify] Razorpay order ID mismatch:",
        `expected=${order.razorpay_order_id}`,
        `received=${razorpayOrderId}`
      );
      return NextResponse.json(
        { success: false, error: "Payment verification failed: order mismatch" },
        { status: 400 }
      );
    }

    // Check if already processed
    if (order.payment_status === "completed") {
      return NextResponse.json({
        success: true,
        verified: true,
        paymentStatus: "completed",
        orderStatus: order.status,
      });
    }

    // Verify signature
    const signatureValid = verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!signatureValid) {
      console.error("[Razorpay Verify] Invalid signature for payment:", razorpayPaymentId);

      // Record failed verification attempt
      await supabase.rpc("record_payment_transaction", {
        p_order_id: orderId,
        p_razorpay_order_id: razorpayOrderId,
        p_razorpay_payment_id: razorpayPaymentId,
        p_event_type: "browser_callback",
        p_amount_paise: order.total_paise,
        p_currency: "INR",
        p_status: "failed",
        p_error_code: "signature_verification_failed",
        p_error_description: "Invalid payment signature",
      });

      return NextResponse.json(
        { success: false, error: "Payment verification failed: invalid signature" },
        { status: 400 }
      );
    }

    // Fetch payment details from Razorpay to verify amount and status
    let paymentDetails;
    try {
      paymentDetails = await fetchPaymentDetails(razorpayPaymentId);
    } catch (error) {
      console.error("[Razorpay Verify] Failed to fetch payment details:", error);
      return NextResponse.json(
        { success: false, error: "Failed to verify payment details" },
        { status: 500 }
      );
    }

    // Verify payment details
    if (paymentDetails.order_id !== razorpayOrderId) {
      console.error(
        "[Razorpay Verify] Payment order ID mismatch:",
        `expected=${razorpayOrderId}`,
        `received=${paymentDetails.order_id}`
      );
      return NextResponse.json(
        { success: false, error: "Payment verification failed: order mismatch" },
        { status: 400 }
      );
    }

    if (paymentDetails.amount !== order.total_paise) {
      console.error(
        "[Razorpay Verify] Payment amount mismatch:",
        `expected=${order.total_paise}`,
        `received=${paymentDetails.amount}`
      );
      return NextResponse.json(
        { success: false, error: "Payment verification failed: amount mismatch" },
        { status: 400 }
      );
    }

    if (paymentDetails.currency !== "INR") {
      console.error(
        "[Razorpay Verify] Currency mismatch:",
        `expected=INR`,
        `received=${paymentDetails.currency}`
      );
      return NextResponse.json(
        { success: false, error: "Payment verification failed: currency mismatch" },
        { status: 400 }
      );
    }

    // Check payment status
    const isPaymentSuccessful =
      paymentDetails.status === "captured" ||
      paymentDetails.status === "authorized";

    if (!isPaymentSuccessful) {
      // Record failed payment
      await supabase.rpc("record_payment_transaction", {
        p_order_id: orderId,
        p_razorpay_order_id: razorpayOrderId,
        p_razorpay_payment_id: razorpayPaymentId,
        p_event_type: "browser_callback",
        p_amount_paise: paymentDetails.amount,
        p_currency: paymentDetails.currency,
        p_status: paymentDetails.status,
        p_method: paymentDetails.method,
        p_error_code: paymentDetails.error_code,
        p_error_description: paymentDetails.error_description,
        p_raw_response: paymentDetails,
      });

      // Update order status to payment_failed
      await supabase.rpc("update_payment_status_atomic", {
        p_order_id: orderId,
        p_razorpay_order_id: razorpayOrderId,
        p_razorpay_payment_id: razorpayPaymentId,
        p_payment_method: "razorpay",
        p_new_payment_status: "failed",
        p_new_order_status: "payment_failed",
        p_expected_amount_paise: order.total_paise,
      });

      return NextResponse.json(
        {
          success: false,
          error: `Payment failed: ${paymentDetails.error_description || paymentDetails.status}`
        },
        { status: 400 }
      );
    }

    // Payment is successful - record transaction and update order
    const { error: transactionError } = await supabase.rpc("record_payment_transaction", {
      p_order_id: orderId,
      p_razorpay_order_id: razorpayOrderId,
      p_razorpay_payment_id: razorpayPaymentId,
      p_event_type: "browser_callback",
      p_amount_paise: paymentDetails.amount,
      p_currency: paymentDetails.currency,
      p_status: paymentDetails.status,
      p_method: paymentDetails.method,
      p_webhook_signature_verified: true,
      p_raw_response: paymentDetails,
    });

    if (transactionError) {
      console.error("[Razorpay Verify] Failed to record transaction:", transactionError);
    }

    // Update order payment status to completed
    const { error: updateError } = await supabase.rpc("update_payment_status_atomic", {
      p_order_id: orderId,
      p_razorpay_order_id: razorpayOrderId,
      p_razorpay_payment_id: razorpayPaymentId,
      p_payment_method: "razorpay",
      p_new_payment_status: "completed",
      p_new_order_status: "confirmed",
      p_expected_amount_paise: order.total_paise,
    });

    if (updateError) {
      console.error("[Razorpay Verify] Failed to update order status:", updateError);
      return NextResponse.json(
        { success: false, error: "Payment verified but failed to update order" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
      paymentStatus: "completed",
      orderStatus: "confirmed",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Razorpay Verify] Unexpected error:", message);
    return NextResponse.json(
      { success: false, error: "Payment verification failed" },
      { status: 500 }
    );
  }
}
