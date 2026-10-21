-- MIVO Product Variants Weight-Based Pricing
-- Migration 013: Add production weight and material pricing system
-- Created: 2026-10-21
-- Dependencies: 002_catalogue_schema.sql

-- ============================================================================
-- PART 1: Material Pricing Settings
-- ============================================================================

-- Material pricing settings table
-- Stores per-gram rates for each supported material
CREATE TABLE IF NOT EXISTS public.material_pricing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material TEXT NOT NULL UNIQUE,
  rate_paise_per_gram INTEGER NOT NULL CHECK (rate_paise_per_gram > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insert default material rates
-- PLA: ₹5/g = 500 paise/g
-- PETG: ₹6/g = 600 paise/g
-- TPU: ₹8/g = 800 paise/g
INSERT INTO public.material_pricing_settings (material, rate_paise_per_gram, is_active)
VALUES
  ('PLA', 500, true),
  ('PETG', 600, true),
  ('TPU', 800, true)
ON CONFLICT (material) DO NOTHING;

-- Index for active material lookup
CREATE INDEX IF NOT EXISTS idx_material_pricing_active
  ON public.material_pricing_settings(material)
  WHERE is_active = TRUE;

-- RLS for material pricing
ALTER TABLE public.material_pricing_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view active material rates
CREATE POLICY "Anyone can view active material rates"
  ON public.material_pricing_settings FOR SELECT
  USING (is_active = TRUE);

-- Admins can manage material rates
CREATE POLICY "Admins can manage material rates"
  ON public.material_pricing_settings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Trigger for updated_at
CREATE TRIGGER handle_material_pricing_updated_at
  BEFORE UPDATE ON public.material_pricing_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- PART 2: Update Product Variants Schema
-- ============================================================================

-- Add production weight to product_variants
-- This is the actual weight needed to manufacture the product
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS production_weight_grams NUMERIC
    CHECK (production_weight_grams IS NULL OR production_weight_grams > 0);

-- Add a status column to variants for better control
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Index for active variants
CREATE INDEX IF NOT EXISTS idx_variants_active
  ON public.product_variants(product_id, is_active)
  WHERE is_active = TRUE;

-- ============================================================================
-- PART 3: Update Order Line Items Schema
-- ============================================================================

-- Add weight and rate snapshots to order line items
-- These are immutable snapshots at the time of order creation
ALTER TABLE public.order_line_items
  ADD COLUMN IF NOT EXISTS production_weight_grams NUMERIC
    CHECK (production_weight_grams IS NULL OR production_weight_grams > 0);

ALTER TABLE public.order_line_items
  ADD COLUMN IF NOT EXISTS material_rate_paise_per_gram INTEGER
    CHECK (material_rate_paise_per_gram IS NULL OR material_rate_paise_per_gram > 0);

-- Add dimensions snapshot to order line items
ALTER TABLE public.order_line_items
  ADD COLUMN IF NOT EXISTS length_mm NUMERIC
    CHECK (length_mm IS NULL OR length_mm > 0);

ALTER TABLE public.order_line_items
  ADD COLUMN IF NOT EXISTS width_mm NUMERIC
    CHECK (width_mm IS NULL OR width_mm > 0);

ALTER TABLE public.order_line_items
  ADD COLUMN IF NOT EXISTS height_mm NUMERIC
    CHECK (height_mm IS NULL OR height_mm > 0);

-- ============================================================================
-- PART 4: Helper Functions
-- ============================================================================

-- Function to calculate variant price based on weight and material
CREATE OR REPLACE FUNCTION public.calculate_variant_price(
  p_material TEXT,
  p_weight_grams NUMERIC
)
RETURNS INTEGER AS $$
DECLARE
  v_rate_paise_per_gram INTEGER;
  v_price_paise INTEGER;
BEGIN
  -- Get the current rate for this material
  SELECT rate_paise_per_gram INTO v_rate_paise_per_gram
  FROM public.material_pricing_settings
  WHERE material = p_material
    AND is_active = TRUE;

  -- If material not found, return NULL
  IF v_rate_paise_per_gram IS NULL THEN
    RETURN NULL;
  END IF;

  -- Calculate: weight × rate, rounded to nearest paise
  v_price_paise := ROUND(p_weight_grams * v_rate_paise_per_gram);

  -- Ensure non-negative
  IF v_price_paise < 0 THEN
    v_price_paise := 0;
  END IF;

  RETURN v_price_paise;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get available materials for pricing
CREATE OR REPLACE FUNCTION public.get_active_materials()
RETURNS TABLE (
  material TEXT,
  rate_paise_per_gram INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mps.material,
    mps.rate_paise_per_gram
  FROM public.material_pricing_settings mps
  WHERE mps.is_active = TRUE
  ORDER BY mps.material;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- PART 5: Update Atomic Order Function
-- ============================================================================

-- Drop and recreate the atomic order function with weight tracking
DROP FUNCTION IF EXISTS public.create_order_atomic(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, TEXT, JSONB);

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

  -- Insert all line items (now with weight and dimension snapshots)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_line_items)
  LOOP
    INSERT INTO public.order_line_items (
      order_id, product_id, variant_id,
      product_name, variant_sku, size_name, material, selected_color,
      quantity, unit_price_paise, line_total_paise,
      production_weight_grams, material_rate_paise_per_gram,
      length_mm, width_mm, height_mm
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
      (v_item->>'line_total_paise')::INTEGER,
      CASE WHEN v_item->>'production_weight_grams' IS NOT NULL
        THEN (v_item->>'production_weight_grams')::NUMERIC
        ELSE NULL
      END,
      CASE WHEN v_item->>'material_rate_paise_per_gram' IS NOT NULL
        THEN (v_item->>'material_rate_paise_per_gram')::INTEGER
        ELSE NULL
      END,
      CASE WHEN v_item->>'length_mm' IS NOT NULL
        THEN (v_item->>'length_mm')::NUMERIC
        ELSE NULL
      END,
      CASE WHEN v_item->>'width_mm' IS NOT NULL
        THEN (v_item->>'width_mm')::NUMERIC
        ELSE NULL
      END,
      CASE WHEN v_item->>'height_mm' IS NOT NULL
        THEN (v_item->>'height_mm')::NUMERIC
        ELSE NULL
      END
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

-- ============================================================================
-- PART 6: Data Validation and Constraints
-- ============================================================================

-- Add comment to production_weight_grams
COMMENT ON COLUMN public.product_variants.production_weight_grams IS
  'Production weight in grams for this specific variant. Used to calculate price with material rate.';

COMMENT ON COLUMN public.order_line_items.production_weight_grams IS
  'Immutable snapshot of production weight at time of order creation.';

COMMENT ON COLUMN public.order_line_items.material_rate_paise_per_gram IS
  'Immutable snapshot of material rate (in paise per gram) at time of order creation.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 013_product_variants_weight_pricing.sql completed successfully';
  RAISE NOTICE 'Tables created/updated:';
  RAISE NOTICE '  - material_pricing_settings (new)';
  RAISE NOTICE '  - product_variants (added production_weight_grams, is_active)';
  RAISE NOTICE '  - order_line_items (added weight/rate/dimension snapshots)';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - calculate_variant_price(material, weight)';
  RAISE NOTICE '  - get_active_materials()';
  RAISE NOTICE '  - create_order_atomic (updated with weight tracking)';
  RAISE NOTICE 'Default material rates: PLA=₹5/g, PETG=₹6/g, TPU=₹8/g';
END $$;
