-- MIVO Database Initialization
-- Migration 001: Extensions and Base Functions
-- Created: 2026-10-19

-- Extensions uuid-ossp and pgcrypto are pre-installed in the extensions schema
-- on Supabase hosted projects. Use gen_random_uuid() instead of uuid_generate_v4().

-- Create updated_at trigger function
-- This function automatically updates the updated_at timestamp on row updates
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate order numbers
-- Format: ORD-YYYYMMDD-XXXXX
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
  date_part TEXT;
  sequence_part TEXT;
  count_today INTEGER;
BEGIN
  date_part := TO_CHAR(NOW(), 'YYYYMMDD');

  -- Count orders created today
  SELECT COUNT(*) INTO count_today
  FROM public.orders
  WHERE created_at::date = CURRENT_DATE;

  sequence_part := LPAD((count_today + 1)::TEXT, 5, '0');

  RETURN 'ORD-' || date_part || '-' || sequence_part;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate quote reference numbers
-- Format: QTE-YYYYMMDD-XXXXX
CREATE OR REPLACE FUNCTION public.generate_quote_reference()
RETURNS TEXT AS $$
DECLARE
  date_part TEXT;
  sequence_part TEXT;
  count_today INTEGER;
BEGIN
  date_part := TO_CHAR(NOW(), 'YYYYMMDD');

  -- Count quote requests created today
  SELECT COUNT(*) INTO count_today
  FROM public.quote_requests
  WHERE created_at::date = CURRENT_DATE;

  sequence_part := LPAD((count_today + 1)::TEXT, 5, '0');

  RETURN 'QTE-' || date_part || '-' || sequence_part;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate quote numbers
-- Format: QUOT-YYYYMMDD-XXXXX-RXX (RXX = revision number)
CREATE OR REPLACE FUNCTION public.generate_quote_number(request_id UUID, revision_num INTEGER)
RETURNS TEXT AS $$
DECLARE
  reference TEXT;
  revision_part TEXT;
BEGIN
  -- Get the request reference number
  SELECT reference_number INTO reference
  FROM public.quote_requests
  WHERE id = request_id;

  revision_part := 'R' || LPAD(revision_num::TEXT, 2, '0');

  RETURN REPLACE(reference, 'QTE-', 'QUOT-') || '-' || revision_part;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 001_init.sql completed successfully';
  RAISE NOTICE 'Extensions enabled: uuid-ossp, pgcrypto';
  RAISE NOTICE 'Functions created: handle_updated_at, generate_order_number, generate_quote_reference, generate_quote_number';
END $$;
