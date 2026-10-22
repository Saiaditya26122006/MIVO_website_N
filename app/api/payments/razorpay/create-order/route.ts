import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createRazorpayOrder, getPublicKeyId } from "@/lib/payments/razorpay";

interface CreatePaymentOrderRequest {
  orderId: string;
}

interface CreatePaymentOrderResponse {
  success: boolean;
  error?: string;
  razorpayOrderId?: string;
  razorpayKeyId?: string;
  amount?: number;
  currency?: string;
  orderNumber?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<CreatePaymentOrderResponse>> {
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

    const body: CreatePaymentOrderRequest = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Order ID is required" },
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
      console.error("[Razorpay Create Order] Order not found:", orderId, orderError?.message);
      return NextResponse.json(
        { success: false, error: "Order not found or access denied" },
        { status: 404 }
      );
    }

    // Verify order is in a state where payment can be initiated
    if (order.payment_status === "completed") {
      return NextResponse.json(
        { success: false, error: "Order is already paid" },
        { status: 400 }
      );
    }

    if (order.status === "cancelled") {
      return NextResponse.json(
        { success: false, error: "Order is cancelled" },
        { status: 400 }
      );
    }

    // Check if Razorpay order already exists
    if (order.razorpay_order_id) {
      return NextResponse.json({
        success: true,
        razorpayOrderId: order.razorpay_order_id,
        razorpayKeyId: getPublicKeyId(),
        amount: order.total_paise,
        currency: "INR",
        orderNumber: order.order_number,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone,
      });
    }

    // Create Razorpay order
    const razorpayOrder = await createRazorpayOrder({
      amountPaise: order.total_paise,
      currency: "INR",
      receiptId: order.order_number,
      notes: {
        mivo_order_id: orderId,
        mivo_order_number: order.order_number,
        customer_email: order.customer_email,
      },
    });

    // Update order with Razorpay order ID and set payment status to initiated
    const { error: updateError } = await supabase.rpc(
      "update_payment_status_atomic",
      {
        p_order_id: orderId,
        p_razorpay_order_id: razorpayOrder.id,
        p_razorpay_payment_id: null,
        p_payment_method: "razorpay",
        p_new_payment_status: "initiated",
        p_new_order_status: null,
        p_expected_amount_paise: order.total_paise,
      }
    );

    if (updateError) {
      console.error("[Razorpay Create Order] Failed to update order:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to initiate payment" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      razorpayKeyId: getPublicKeyId(),
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      orderNumber: order.order_number,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Razorpay Create Order] Unexpected error:", message);
    return NextResponse.json(
      { success: false, error: "Failed to create payment order" },
      { status: 500 }
    );
  }
}
