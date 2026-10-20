-- Fix generate_quote_reference function
-- Migration 009: Fix table name from quote_requests to quotation_requests
-- Created: 2026-10-20
--
-- The original function in 001_init.sql referenced public.quote_requests,
-- but migration 005 created the table as public.quotation_requests.

CREATE OR REPLACE FUNCTION public.generate_quote_reference()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  date_part TEXT;
  sequence_part TEXT;
  count_today INTEGER;
BEGIN
  date_part := TO_CHAR(NOW(), 'YYYYMMDD');

  SELECT COUNT(*) INTO count_today
  FROM public.quotation_requests
  WHERE created_at::date = CURRENT_DATE;

  sequence_part := LPAD((count_today + 1)::TEXT, 5, '0');

  RETURN 'QTE-' || date_part || '-' || sequence_part;
END;
$$;
