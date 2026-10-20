-- Migration 011: Shipping settings table + order tracking fields

-- Shipping settings (admin-configurable)
CREATE TABLE IF NOT EXISTS public.shipping_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flat_rate_paise INTEGER NOT NULL DEFAULT 10000 CHECK (flat_rate_paise >= 0),
  free_shipping_threshold_paise INTEGER DEFAULT NULL CHECK (free_shipping_threshold_paise IS NULL OR free_shipping_threshold_paise > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.shipping_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active shipping settings"
  ON public.shipping_settings FOR SELECT
  USING (TRUE);

CREATE POLICY "Admins can update shipping settings"
  ON public.shipping_settings FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can insert shipping settings"
  ON public.shipping_settings FOR INSERT
  WITH CHECK (is_admin());

-- Seed default shipping rate
INSERT INTO public.shipping_settings (flat_rate_paise, is_active)
VALUES (10000, TRUE);

-- Order tracking fields
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_number TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS shipping_provider TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT DEFAULT NULL;

-- Product images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: admins only can upload/delete
CREATE POLICY "Admins can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND is_admin());

CREATE POLICY "Admins can update product images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-images' AND is_admin());

CREATE POLICY "Admins can delete product images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND is_admin());

CREATE POLICY "Anyone can view product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');
