import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CreateOrderRequest, CreateOrderResponse } from "@/lib/data/cart-types";

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

    if (!contactDetails) {
      return NextResponse.json(
        { success: false, error: "Contact details are required" },
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

    // Validate and price each item against the trusted catalogue.
    // Uses the server Supabase client directly — the previous getProductById
    // import used a browser client (createBrowserClient) which throws in
    // server-side API routes where no browser context exists.
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

      const { data: product, error: productError } = await supabase
        .from("products")
        .select(`
          id, name, status,
          product_variants(
            id, sku, size_name, material, color_options, price_paise,
            production_weight_grams, length_mm, width_mm, height_mm, is_active
          )
        `)
        .eq("id", item.productId)
        .eq("status", "published")
        .single();

      if (productError || !product) {
        console.error("[Order Creation] Product lookup failed:", item.productId, productError?.message);
        return NextResponse.json(
          { success: false, error: `Product not available: ${item.productId}` },
          { status: 400 }
        );
      }

      const variants = (product as Record<string, unknown>).product_variants as Array<{
        id: string;
        sku: string;
        size_name: string;
        material: string;
        color_options: string[];
        price_paise: number;
        production_weight_grams: number | null;
        length_mm: number;
        width_mm: number;
        height_mm: number;
        is_active: boolean;
      }>;

      const variant = variants?.find((v) => v.id === item.variantId);

      if (!variant) {
        return NextResponse.json(
          { success: false, error: `Variant not found: ${item.variantId}` },
          { status: 400 }
        );
      }

      // Check if variant is active
      if (variant.is_active === false) {
        return NextResponse.json(
          { success: false, error: `Variant ${variant.sku} is not available` },
          { status: 400 }
        );
      }

      const colorOptions = variant.color_options || [];
      if (colorOptions.length > 0 && !colorOptions.includes(item.selectedColor)) {
        return NextResponse.json(
          { success: false, error: `Invalid color option: ${item.selectedColor}` },
          { status: 400 }
        );
      }

      // Get material rate for pricing snapshot
      let materialRatePaisePerGram: number | null = null;
      if (variant.production_weight_grams) {
        const { data: materialRate } = await supabase
          .from("material_pricing_settings")
          .select("rate_paise_per_gram")
          .eq("material", variant.material)
          .eq("is_active", true)
          .single();

        if (materialRate) {
          materialRatePaisePerGram = materialRate.rate_paise_per_gram;

          // Recalculate price server-side to prevent tampering
          const calculatedPrice = Math.round(variant.production_weight_grams * materialRate.rate_paise_per_gram);

          // Verify the variant's stored price matches calculation (allow 1 paise tolerance for rounding)
          if (Math.abs(variant.price_paise - calculatedPrice) > 1) {
            console.warn(
              `[Order Creation] Price mismatch for variant ${variant.sku}: ` +
              `stored=${variant.price_paise}, calculated=${calculatedPrice}`
            );
          }
        }
      }

      const unitPricePaise = variant.price_paise;
      const lineTotalPaise = unitPricePaise * item.quantity;

      validatedItems.push({
        product_id: product.id,
        product_name: product.name,
        variant_id: variant.id,
        variant_sku: variant.sku,
        size_name: variant.size_name,
        material: variant.material,
        selected_color: item.selectedColor,
        quantity: item.quantity,
        unit_price_paise: unitPricePaise,
        line_total_paise: lineTotalPaise,
        production_weight_grams: variant.production_weight_grams,
        material_rate_paise_per_gram: materialRatePaisePerGram,
        length_mm: variant.length_mm,
        width_mm: variant.width_mm,
        height_mm: variant.height_mm,
      });

      subtotalPaise += lineTotalPaise;
    }

    // Get shipping rate from database settings
    const { data: shippingSettings } = await supabase
      .from("shipping_settings")
      .select("flat_rate_paise, free_shipping_threshold_paise")
      .eq("is_active", true)
      .single();

    let shippingPaise = shippingSettings?.flat_rate_paise || 10000; // default ₹100

    // Apply free shipping threshold if configured
    if (
      shippingSettings?.free_shipping_threshold_paise &&
      subtotalPaise >= shippingSettings.free_shipping_threshold_paise
    ) {
      shippingPaise = 0;
    }

    const totalPaise = subtotalPaise + shippingPaise;

    const effectiveIdempotencyKey =
      idempotencyKey || `auto_${user.id}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

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
        p_line_items: validatedItems,
      }
    );

    if (rpcError) {
      console.error("[Order Creation] RPC error:", rpcError.code, rpcError.message);

      if (rpcError.code === "42883" || rpcError.message?.includes("does not exist")) {
        return NextResponse.json(
          { success: false, error: "Order service unavailable. The create_order_atomic database function is not deployed." },
          { status: 503 }
        );
      }

      if (rpcError.code === "40001" || rpcError.message?.includes("serialization_failure")) {
        return NextResponse.json(
          { success: false, error: "Concurrent order submission detected. Please retry." },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { success: false, error: `Failed to create order: ${rpcError.message}` },
        { status: 500 }
      );
    }

    if (!rpcResult) {
      return NextResponse.json(
        { success: false, error: "Failed to create order: no result returned" },
        { status: 500 }
      );
    }

    const result = rpcResult as { order_id: string; order_number?: string; deduplicated: boolean };
    return NextResponse.json({
      success: true,
      orderId: result.order_id,
      orderNumber: result.order_number,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Order Creation] Unexpected error:", message);
    if (error instanceof Error && error.stack) {
      console.error("[Order Creation] Stack:", error.stack);
    }
    return NextResponse.json(
      { success: false, error: `Order creation failed: ${message}` },
      { status: 500 }
    );
  }
}
