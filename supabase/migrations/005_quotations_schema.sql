-- MIVO Quotations Schema
-- Migration 005: Custom quotation requests and quotes
-- Created: 2026-10-19
-- Dependencies: 001_init.sql (generate_quote_reference), 003_auth_profiles.sql (customer_profiles)

-- Quotation Requests Table
CREATE TABLE IF NOT EXISTS public.quotation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_reference TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,

  -- Contact details (snapshot from submission)
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,

  -- Project description
  project_title TEXT NOT NULL,
  project_description TEXT NOT NULL,
  category_id UUID, -- Optional reference to product category

  -- Custom specifications
  has_custom_dimensions BOOLEAN NOT NULL DEFAULT FALSE,
  custom_length_mm INTEGER CHECK (custom_length_mm IS NULL OR custom_length_mm > 0),
  custom_width_mm INTEGER CHECK (custom_width_mm IS NULL OR custom_width_mm > 0),
  custom_height_mm INTEGER CHECK (custom_height_mm IS NULL OR custom_height_mm > 0),

  has_custom_design BOOLEAN NOT NULL DEFAULT FALSE,
  design_file_urls TEXT[] DEFAULT '{}',

  -- Preferences
  preferred_material TEXT,
  preferred_color TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),

  -- Budget and timeline
  budget_min_paise INTEGER CHECK (budget_min_paise IS NULL OR budget_min_paise >= 0),
  budget_max_paise INTEGER CHECK (budget_max_paise IS NULL OR budget_max_paise >= 0),
  required_by_date DATE,

  -- Additional notes
  additional_notes TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN (
      'pending_review',
      'under_review',
      'quote_provided',
      'quote_accepted',
      'quote_rejected',
      'order_created',
      'cancelled'
    )),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  reviewed_at TIMESTAMPTZ,
  quoted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT check_budget_range CHECK (
    budget_min_paise IS NULL OR
    budget_max_paise IS NULL OR
    budget_max_paise >= budget_min_paise
  )
);

-- Quotation Quotes Table
CREATE TABLE IF NOT EXISTS public.quotation_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotation_requests(id) ON DELETE CASCADE,

  -- Pricing breakdown
  item_description TEXT NOT NULL,
  quantity_quoted INTEGER NOT NULL CHECK (quantity_quoted > 0),
  unit_price_paise INTEGER NOT NULL CHECK (unit_price_paise >= 0),
  subtotal_paise INTEGER NOT NULL CHECK (subtotal_paise >= 0),
  shipping_paise INTEGER NOT NULL CHECK (shipping_paise >= 0),
  total_price_paise INTEGER NOT NULL CHECK (total_price_paise >= 0),

  -- Production details
  estimated_production_days INTEGER NOT NULL CHECK (estimated_production_days > 0),
  valid_until_date DATE NOT NULL,

  -- Admin notes
  internal_notes TEXT,
  customer_facing_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT check_quote_totals CHECK (
    total_price_paise = subtotal_paise + shipping_paise
  ),
  CONSTRAINT check_subtotal_matches CHECK (
    subtotal_paise = quantity_quoted * unit_price_paise
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quotation_requests_customer_id
  ON public.quotation_requests(customer_id);

CREATE INDEX IF NOT EXISTS idx_quotation_requests_status
  ON public.quotation_requests(status);

CREATE INDEX IF NOT EXISTS idx_quotation_requests_created_at
  ON public.quotation_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quotation_quotes_quotation_id
  ON public.quotation_quotes(quotation_id);

-- RLS Policies
ALTER TABLE public.quotation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_quotes ENABLE ROW LEVEL SECURITY;

-- Customers can view their own quotation requests
CREATE POLICY "Customers can view own quotation requests"
  ON public.quotation_requests FOR SELECT
  USING (auth.uid() = customer_id);

-- Customers can create quotation requests for themselves
CREATE POLICY "Customers can create own quotation requests"
  ON public.quotation_requests FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- Customers can view quotes for their quotations
CREATE POLICY "Customers can view quotes for own quotations"
  ON public.quotation_quotes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quotation_requests
      WHERE quotation_requests.id = quotation_quotes.quotation_id
      AND quotation_requests.customer_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER handle_quotation_requests_updated_at
  BEFORE UPDATE ON public.quotation_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 005_quotations_schema.sql completed successfully';
  RAISE NOTICE 'Tables created: quotation_requests, quotation_quotes';
  RAISE NOTICE 'RLS policies applied for customer quotation isolation';
END $$;
