-- MIVO Orders Schema
-- Migration 004: Orders and order line items
-- Created: 2026-10-19
-- Dependencies: 001_init.sql (generate_order_number), 003_auth_profiles.sql (customer_profiles)

-- Orders Table
-- Stores customer orders with immutable snapshots of pricing and shipping
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,

  -- Order status
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN (
      'pending_payment',
      'payment_failed',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'cancelled'
    )),

  -- Contact details (immutable snapshot from checkout)
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,

  -- Shipping address (immutable snapshot)
  shipping_address_line1 TEXT NOT NULL,
  shipping_address_line2 TEXT,
  shipping_city TEXT NOT NULL,
  shipping_state TEXT NOT NULL,
  shipping_postal_code TEXT NOT NULL,
  shipping_country TEXT NOT NULL DEFAULT 'IN',

  -- Pricing (server-calculated, immutable at creation)
  subtotal_paise INTEGER NOT NULL CHECK (subtotal_paise >= 0),
  shipping_paise INTEGER NOT NULL CHECK (shipping_paise >= 0),
  total_paise INTEGER NOT NULL CHECK (total_paise >= 0),

  -- Payment tracking (M5/M6)
  payment_method TEXT,
  payment_id TEXT, -- External payment gateway transaction ID
  payment_status TEXT DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'initiated', 'completed', 'failed')),

  -- Special instructions from customer
  special_instructions TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  paid_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT check_total_matches_sum CHECK (
    total_paise = subtotal_paise + shipping_paise
  )
);

-- Order Line Items Table
-- Stores immutable snapshots of ordered products
CREATE TABLE IF NOT EXISTS public.order_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,

  -- Product reference (for admin lookup, may be deleted/archived later)
  product_id UUID NOT NULL,
  variant_id UUID NOT NULL,

  -- Immutable product snapshot
  product_name TEXT NOT NULL,
  variant_sku TEXT NOT NULL,
  size_name TEXT NOT NULL,
  material TEXT NOT NULL,
  selected_color TEXT NOT NULL,

  -- Pricing (server-validated at order creation)
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_paise INTEGER NOT NULL CHECK (unit_price_paise >= 0),
  line_total_paise INTEGER NOT NULL CHECK (line_total_paise >= 0),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT check_line_total_matches CHECK (
    line_total_paise = quantity * unit_price_paise
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_customer_id
  ON public.orders(customer_id);

CREATE INDEX IF NOT EXISTS idx_orders_order_number
  ON public.orders(order_number);

CREATE INDEX IF NOT EXISTS idx_orders_status
  ON public.orders(status);

CREATE INDEX IF NOT EXISTS idx_orders_created_at
  ON public.orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_line_items_order_id
  ON public.order_line_items(order_id);

CREATE INDEX IF NOT EXISTS idx_order_line_items_product_id
  ON public.order_line_items(product_id);

-- RLS Policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_line_items ENABLE ROW LEVEL SECURITY;

-- Customers can view their own orders
CREATE POLICY "Customers can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = customer_id);

-- Customers can create orders for themselves
CREATE POLICY "Customers can create own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Customers can view line items of their own orders
CREATE POLICY "Customers can view own order line items"
  ON public.order_line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_line_items.order_id
      AND orders.customer_id = auth.uid()
    )
  );

-- Customers can create line items for their own orders
CREATE POLICY "Customers can create own order line items"
  ON public.order_line_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_line_items.order_id
      AND orders.customer_id = auth.uid()
    )
  );

-- Trigger for updated_at on orders
CREATE TRIGGER handle_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 004_orders_schema.sql completed successfully';
  RAISE NOTICE 'Tables created: orders, order_line_items';
  RAISE NOTICE 'RLS policies applied for customer order isolation';
  RAISE NOTICE 'Constraints enforce pricing integrity and immutable snapshots';
END $$;
