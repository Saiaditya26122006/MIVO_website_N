import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProductById } from "@/services/products.service";
import type { CreateOrderRequest, CreateOrderResponse } from "@/lib/data/cart-types";

/**
 * POST /api/orders/create
 *
 * Server-side order creation with:
 * - Price validation against trusted catalogue (never trust client prices)
 * - Atomic order + line-item creation via database transaction (RPC)
 * - Idempotency key to prevent duplicate orders from retries/double-clicks
 * - Ownership check (order belongs to authenticated user)
 */
export async function POST(request: NextRequest): Promise<NextResponse<CreateOrderResponse>> {
  try {
    const supabase = await createClient();

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

    const body: CreateOrderRequest & { idempotencyKey?: string } = await request.json();
    const { items, contactDetails, idempotencyKey } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Order must contain at least one item" },
        { status: 400 }
      );
    }

    // Validate contact details
    const validationErrors: Record<string, string> = {};

    if (!contactDetails.customerName?.trim()) {
      validationErrors.customerName = "Name is required";
    }
    if (!contactDetails.customerEmail?.trim()) {
      validationErrors.customerEmail = "Email is required";
    }
    if (!contactDetails.customerPhone?.trim()) {
      validationErrors.customerPhone = "Phone is required";
    }
    if (!contactDetails.shippingAddressLine1?.trim()) {
      validationErrors.shippingAddressLine1 = "Address is required";
    }
    if (!contactDetails.shippingCity?.trim()) {
      validationErrors.shippingCity = "City is required";
    }
    if (!contactDetails.shippingState?.trim()) {
      validationErrors.shippingState = "State is required";
    }
    if (!contactDetails.shippingPostalCode?.trim()) {
      validationErrors.shippingPostalCode = "Postal code is required";
    }

    if (Object.keys(validationErrors).length > 0) {
      return NextResponse.json(
        { success: false, error: "Validation failed", validationErrors },
        { status: 400 }
      );
    }

    // Validate and price each item from trusted catalogue
    const validatedItems = [];
    let subtotalPaise = 0;

    for (const item of items) {
      if (!item.productId || !item.variantId || !item.selectedColor || !item.quantity) {
        return NextResponse.json(
          { success: false, error: "Invalid item structure" },
          { status: 400 }
        );
      }

      if (item.quantity < 1 || item.quantity > 99) {
        return NextResponse.json(
          { success: false, error: `Invalid quantity for item: ${item.quantity}` },
          { status: 400 }
        );
      }

      const product = await getProductById(item.productId);

      if (!product || product.status !== "published") {
        return NextResponse.json(
          { success: false, error: `Product not available: ${item.productId}` },
          { status: 400 }
        );
      }

      const variant = product.variants.find((v) => v.id === item.variantId);

      if (!variant) {
        return NextResponse.json(
          { success: false, error: `Variant not found: ${item.variantId}` },
          { status: 400 }
        );
      }

      if (variant.colorOptions.length > 0 && !variant.colorOptions.includes(item.selectedColor)) {
        return NextResponse.json(
          { success: false, error: `Invalid color option: ${item.selectedColor}` },
          { status: 400 }
        );
      }

      const unitPricePaise = variant.pricePaise;
      const lineTotalPaise = unitPricePaise * item.quantity;

      validatedItems.push({
        product_id: product.id,
        product_name: product.name,
        variant_id: variant.id,
        variant_sku: variant.sku,
        size_name: variant.sizeName,
        material: variant.material,
        selected_color: item.selectedColor,
        quantity: item.quantity,
        unit_price_paise: unitPricePaise,
        line_total_paise: lineTotalPaise,
      });

      subtotalPaise += lineTotalPaise;
    }

    const shippingPaise = 10000; // ₹100 flat rate
    const totalPaise = subtotalPaise + shippingPaise;

    // Generate or use provided idempotency key
    const effectiveIdempotencyKey =
      idempotencyKey || `auto_${user.id}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // Try atomic RPC-based creation first
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "create_order_atomic",
      {
        p_idempotency_key: effectiveIdempotencyKey,
        p_customer_id: user.id,
        p_customer_name: contactDetails.customerName,
        p_customer_email: contactDetails.customerEmail,
        p_customer_phone: contactDetails.customerPhone,
        p_shipping_address_line1: contactDetails.shippingAddressLine1,
        p_shipping_address_line2: contactDetails.shippingAddressLine2 || null,
        p_shipping_city: contactDetails.shippingCity,
        p_shipping_state: contactDetails.shippingState,
        p_shipping_postal_code: contactDetails.shippingPostalCode,
        p_shipping_country: contactDetails.shippingCountry || "IN",
        p_subtotal_paise: subtotalPaise,
        p_shipping_paise: shippingPaise,
        p_total_paise: totalPaise,
        p_special_instructions: contactDetails.specialInstructions || null,
        p_line_items: JSON.stringify(validatedItems),
      }
    );

    if (!rpcError && rpcResult) {
      const result = rpcResult as { order_id: string; order_number?: string; deduplicated: boolean };
      return NextResponse.json({
        success: true,
        orderId: result.order_id,
        orderNumber: result.order_number,
      });
    }

    // Fallback: if the RPC doesn't exist yet (function not deployed),
    // use the sequential insert approach
    if (rpcError?.code === "42883" || rpcError?.message?.includes("does not exist")) {
      console.warn("[Order Creation] Atomic RPC not available, falling back to sequential insert");
      return await createOrderSequential(supabase, user.id, contactDetails, validatedItems, subtotalPaise, shippingPaise, totalPaise);
    }

    console.error("[Order Creation] RPC error:", rpcError);
    return NextResponse.json(
      { success: false, error: "Failed to create order" },
      { status: 500 }
    );
  } catch (error) {
    console.error("[Order Creation] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Fallback sequential order creation when the atomic RPC is not deployed.
 * Less safe than the RPC (not truly atomic), but preserves functionality
 * during the migration period.
 */
async function createOrderSequential(
  supabase: Awaited<ReturnType<typeof createClient>>,
  customerId: string,
  contactDetails: CreateOrderRequest["contactDetails"],
  validatedItems: Array<Record<string, unknown>>,
  subtotalPaise: number,
  shippingPaise: number,
  totalPaise: number
): Promise<NextResponse<CreateOrderResponse>> {
  const { data: orderNumberData, error: orderNumberError } = await supabase.rpc(
    "generate_order_number"
  );

  if (orderNumberError) {
    console.error("[Order Creation] Failed to generate order number:", orderNumberError);
    return NextResponse.json(
      { success: false, error: "Failed to generate order number" },
      { status: 500 }
    );
  }

  const orderNumber = orderNumberData as string;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      order_number: orderNumber,
      customer_id: customerId,
      status: "pending_payment",
      customer_name: contactDetails.customerName,
      customer_email: contactDetails.customerEmail,
      customer_phone: contactDetails.customerPhone,
      shipping_address_line1: contactDetails.shippingAddressLine1,
      shipping_address_line2: contactDetails.shippingAddressLine2 || null,
      shipping_city: contactDetails.shippingCity,
      shipping_state: contactDetails.shippingState,
      shipping_postal_code: contactDetails.shippingPostalCode,
      shipping_country: contactDetails.shippingCountry || "IN",
      subtotal_paise: subtotalPaise,
      shipping_paise: shippingPaise,
      total_paise: totalPaise,
      payment_method: null,
      payment_id: null,
      payment_status: "pending",
      special_instructions: contactDetails.specialInstructions || null,
    })
    .select()
    .single();

  if (orderError || !order) {
    console.error("[Order Creation] Failed to create order:", orderError);
    return NextResponse.json(
      { success: false, error: "Failed to create order" },
      { status: 500 }
    );
  }

  const lineItemsToInsert = validatedItems.map((item) => ({
    order_id: order.id,
    ...item,
  }));

  const { error: lineItemsError } = await supabase
    .from("order_line_items")
    .insert(lineItemsToInsert);

  if (lineItemsError) {
    console.error("[Order Creation] Failed to create line items:", lineItemsError);
    await supabase.from("orders").delete().eq("id", order.id);

    return NextResponse.json(
      { success: false, error: "Failed to create order line items" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    orderId: order.id,
    orderNumber: order.order_number,
  });
}
