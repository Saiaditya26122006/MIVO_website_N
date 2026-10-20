-- Migration 010: Admin management RLS policies
-- Adds admin access to products, variants, images, categories, orders, and line items

-- Products: Admin can see ALL products (including drafts), and CRUD
CREATE POLICY "Admins can view all products"
  ON public.products FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can insert products"
  ON public.products FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update products"
  ON public.products FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE
  USING (is_admin());

-- Product Variants: Admin CRUD
CREATE POLICY "Admins can view all variants"
  ON public.product_variants FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can insert variants"
  ON public.product_variants FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update variants"
  ON public.product_variants FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete variants"
  ON public.product_variants FOR DELETE
  USING (is_admin());

-- Product Images: Admin CRUD
CREATE POLICY "Admins can view all images"
  ON public.product_images FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can insert images"
  ON public.product_images FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update images"
  ON public.product_images FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete images"
  ON public.product_images FOR DELETE
  USING (is_admin());

-- Categories: Admin write (public read already exists)
CREATE POLICY "Admins can insert categories"
  ON public.categories FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update categories"
  ON public.categories FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete categories"
  ON public.categories FOR DELETE
  USING (is_admin());

-- Orders: Admin read all + update
CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can update all orders"
  ON public.orders FOR UPDATE
  USING (is_admin());

-- Order Line Items: Admin read all
CREATE POLICY "Admins can view all order line items"
  ON public.order_line_items FOR SELECT
  USING (is_admin());
