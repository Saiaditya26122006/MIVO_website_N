import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProductById } from "@/services/products.service";
import type { CreateOrderRequest, CreateOrderResponse } from "@/lib/data/cart-types";

/**
 * POST /api/orders/create
 *
 * Server-side order creation with price validation.
 * CRITICAL: Never trust client-provided prices. Always validate against catalogue.
 */
export async function POST(request: NextRequest): Promise<NextResponse<CreateOrderResponse>> {
  try {
    const supabase = await createClient();

    // Check authentication
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

    // Parse request body
    const body: CreateOrderRequest = await request.json();
    const { items, contactDetails } = body;

    // Validate request structure
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
      // Validate item structure
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

      // Fetch product from trusted source
      const product = await getProductById(item.productId);

      if (!product || product.status !== "published") {
        return NextResponse.json(
          { success: false, error: `Product not available: ${item.productId}` },
          { status: 400 }
        );
      }

      // Find variant
      const variant = product.variants.find((v) => v.id === item.variantId);

      if (!variant) {
        return NextResponse.json(
          { success: false, error: `Variant not found: ${item.variantId}` },
          { status: 400 }
        );
      }

      // Validate color option
      if (variant.colorOptions.length > 0 && !variant.colorOptions.includes(item.selectedColor)) {
        return NextResponse.json(
          { success: false, error: `Invalid color option: ${item.selectedColor}` },
          { status: 400 }
        );
      }

      // Use SERVER-SIDE price from catalogue (never trust client)
      const unitPricePaise = variant.pricePaise;
      const lineTotalPaise = unitPricePaise * item.quantity;

      validatedItems.push({
        productId: product.id,
        productName: product.name,
        variantId: variant.id,
        variantSku: variant.sku,
        sizeName: variant.sizeName,
        material: variant.material,
        selectedColor: item.selectedColor,
        quantity: item.quantity,
        unitPricePaise,
        lineTotalPaise,
      });

      subtotalPaise += lineTotalPaise;
    }

    // Calculate shipping (simple flat rate for now)
    // In M6, this will use admin-configured shipping rates
    const shippingPaise = 10000; // ₹100 flat rate

    const totalPaise = subtotalPaise + shippingPaise;

    // Generate order number
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

    // Create order record
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_id: user.id,
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

    // Create line items
    const lineItemsToInsert = validatedItems.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      variant_id: item.variantId,
      product_name: item.productName,
      variant_sku: item.variantSku,
      size_name: item.sizeName,
      material: item.material,
      selected_color: item.selectedColor,
      quantity: item.quantity,
      unit_price_paise: item.unitPricePaise,
      line_total_paise: item.lineTotalPaise,
    }));

    const { error: lineItemsError } = await supabase
      .from("order_line_items")
      .insert(lineItemsToInsert);

    if (lineItemsError) {
      console.error("[Order Creation] Failed to create line items:", lineItemsError);
      // Try to clean up order
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
  } catch (error) {
    console.error("[Order Creation] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
