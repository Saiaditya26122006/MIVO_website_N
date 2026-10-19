-- MIVO Atomic Order Creation
-- Migration 007: Transaction-based order creation with idempotency
-- Created: 2026-10-19
-- Dependencies: 004_orders_schema.sql

-- Idempotency keys table
-- Prevents duplicate order submissions from retries or concurrent requests
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  key TEXT PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours') NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires
  ON public.idempotency_keys(expires_at);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_customer
  ON public.idempotency_keys(customer_id);

-- RLS for idempotency keys
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can manage own idempotency keys"
  ON public.idempotency_keys FOR ALL
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- Atomic order creation function
-- Creates order + line items in a single transaction
-- Returns the order ID or raises an exception on failure
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
  p_line_items JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_existing_order_id UUID;
  v_order_id UUID;
  v_order_number TEXT;
  v_item JSONB;
BEGIN
  -- Check idempotency: if this key was already used, return the existing order
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

  -- Claim the idempotency key (will fail on conflict = concurrent request)
  INSERT INTO public.idempotency_keys (key, customer_id)
  VALUES (p_idempotency_key, p_customer_id)
  ON CONFLICT (key) DO NOTHING;

  -- If we didn't insert (another request got there first), check again
  IF NOT FOUND THEN
    -- Wait briefly then check if the other request completed
    PERFORM pg_sleep(0.1);
    SELECT order_id INTO v_existing_order_id
    FROM public.idempotency_keys
    WHERE key = p_idempotency_key
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

  -- Create the order
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
    NULL, NULL, 'pending',
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

-- Cleanup expired idempotency keys (call periodically or via pg_cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_idempotency_keys()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM public.idempotency_keys
  WHERE expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  RAISE NOTICE 'Migration 007_atomic_orders.sql completed successfully';
  RAISE NOTICE 'Table created: idempotency_keys';
  RAISE NOTICE 'Functions created: create_order_atomic, cleanup_expired_idempotency_keys';
  RAISE NOTICE 'Atomic order creation with idempotency support enabled';
END $$;
