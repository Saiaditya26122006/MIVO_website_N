-- MIVO Payment Method Enhancement
-- Migration 015: Add payment_method parameter to create_order_atomic
-- Created: 2026-10-22
-- Dependencies: 007_atomic_orders.sql, 014_payment_integration.sql

-- Drop and recreate the function with payment_method parameter
DROP FUNCTION IF EXISTS public.create_order_atomic(
  TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  INTEGER, INTEGER, INTEGER, TEXT, JSONB
);

CREATE OR REPLACE FUNCTION public.create_order_atomic(
  p_idempotency_key TEXT,
  p_customer_id UUID,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT,
  p_shipping_address_line1 TEXT,
  p_shipping_address_line2 TEXT,
  p_shipping_city TEXT,
  p_shipping_state TEXT,
  p_shipping_postal_code TEXT,
  p_shipping_country TEXT,
  p_subtotal_paise INTEGER,
  p_shipping_paise INTEGER,
  p_total_paise INTEGER,
  p_special_instructions TEXT,
  p_line_items JSONB,
  p_payment_method TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_existing_order_id UUID;
  v_order_id UUID;
  v_order_number TEXT;
  v_item JSONB;
BEGIN
  -- Check idempotency: if this key was already used by this customer, return the existing order
  SELECT order_id INTO v_existing_order_id
  FROM public.idempotency_keys
  WHERE key = p_idempotency_key
    AND customer_id = p_customer_id
    AND expires_at > NOW();

  IF v_existing_order_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'order_id', v_existing_order_id,
      'deduplicated', true
    );
  END IF;

  -- If a key exists for a different customer, reject it
  IF EXISTS (
    SELECT 1 FROM public.idempotency_keys
    WHERE key = p_idempotency_key
      AND customer_id != p_customer_id
  ) THEN
    RAISE EXCEPTION 'Idempotency key belongs to a different customer'
      USING ERRCODE = 'invalid_authorization_specification';
  END IF;

  -- Claim the idempotency key (will fail on conflict = concurrent request)
  INSERT INTO public.idempotency_keys (key, customer_id)
  VALUES (p_idempotency_key, p_customer_id)
  ON CONFLICT (key) DO NOTHING;

  -- If we didn't insert (another request got there first), check again
  IF NOT FOUND THEN
    SELECT order_id INTO v_existing_order_id
    FROM public.idempotency_keys
    WHERE key = p_idempotency_key
      AND customer_id = p_customer_id
      AND order_id IS NOT NULL;

    IF v_existing_order_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'order_id', v_existing_order_id,
        'deduplicated', true
      );
    END IF;

    RAISE EXCEPTION 'Concurrent order submission detected. Please retry.'
      USING ERRCODE = 'serialization_failure';
  END IF;

  -- Generate order number
  v_order_number := public.generate_order_number();

  -- Create the order with payment_method
  INSERT INTO public.orders (
    order_number, customer_id, status,
    customer_name, customer_email, customer_phone,
    shipping_address_line1, shipping_address_line2,
    shipping_city, shipping_state, shipping_postal_code, shipping_country,
    subtotal_paise, shipping_paise, total_paise,
    payment_method, payment_id, payment_status,
    special_instructions
  ) VALUES (
    v_order_number, p_customer_id, 'pending_payment',
    p_customer_name, p_customer_email, p_customer_phone,
    p_shipping_address_line1, p_shipping_address_line2,
    p_shipping_city, p_shipping_state, p_shipping_postal_code, p_shipping_country,
    p_subtotal_paise, p_shipping_paise, p_total_paise,
    p_payment_method, NULL, 'pending',
    p_special_instructions
  )
  RETURNING id INTO v_order_id;

  -- Insert all line items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_line_items)
  LOOP
    INSERT INTO public.order_line_items (
      order_id, product_id, variant_id,
      product_name, variant_sku, size_name, material, selected_color,
      quantity, unit_price_paise, line_total_paise
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'variant_id')::UUID,
      v_item->>'product_name',
      v_item->>'variant_sku',
      v_item->>'size_name',
      v_item->>'material',
      v_item->>'selected_color',
      (v_item->>'quantity')::INTEGER,
      (v_item->>'unit_price_paise')::INTEGER,
      (v_item->>'line_total_paise')::INTEGER
    );
  END LOOP;

  -- Link the idempotency key to the created order
  UPDATE public.idempotency_keys
  SET order_id = v_order_id
  WHERE key = p_idempotency_key;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'deduplicated', false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  RAISE NOTICE 'Migration 015_add_payment_method_to_order_creation.sql completed successfully';
  RAISE NOTICE 'Function updated: create_order_atomic now accepts p_payment_method parameter';
  RAISE NOTICE 'COD orders will now have payment_method set to "cod" at creation';
END $$;
