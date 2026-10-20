-- MIVO Admin Quotation RLS Policies
-- Migration 008: Grant admin access to quotation_requests and quotation_quotes
-- Created: 2026-10-20
-- Dependencies: 005_quotations_schema.sql, 006_admin_roles.sql (is_admin() function)
--
-- Migration 006 only added admin policies for customer_profiles.
-- Without these policies, admins cannot list, view, or update quotation requests,
-- nor can they insert quotes.

-- Admin can view ALL quotation requests
CREATE POLICY "Admins can view all quotation requests"
  ON public.quotation_requests FOR SELECT
  USING (public.is_admin());

-- Admin can update ANY quotation request (status transitions)
CREATE POLICY "Admins can update any quotation request"
  ON public.quotation_requests FOR UPDATE
  USING (public.is_admin());

-- Admin can view ALL quotation quotes
CREATE POLICY "Admins can view all quotation quotes"
  ON public.quotation_quotes FOR SELECT
  USING (public.is_admin());

-- Admin can insert quotation quotes
CREATE POLICY "Admins can create quotation quotes"
  ON public.quotation_quotes FOR INSERT
  WITH CHECK (public.is_admin());

-- Admin can update quotation quotes
CREATE POLICY "Admins can update quotation quotes"
  ON public.quotation_quotes FOR UPDATE
  USING (public.is_admin());

DO $$
BEGIN
  RAISE NOTICE 'Migration 008_admin_quotation_policies.sql completed successfully';
  RAISE NOTICE 'Admin RLS policies added for quotation_requests (SELECT, UPDATE)';
  RAISE NOTICE 'Admin RLS policies added for quotation_quotes (SELECT, INSERT, UPDATE)';
END $$;
