-- MIVO Admin Roles & Permissions
-- Migration 006: Admin user role management
-- Created: 2026-10-19
-- Dependencies: 003_auth_profiles.sql

-- Add is_admin flag to customer_profiles
ALTER TABLE public.customer_profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Index for admin queries
CREATE INDEX IF NOT EXISTS idx_customer_profiles_is_admin
  ON public.customer_profiles(is_admin)
  WHERE is_admin = TRUE;

-- Admin check function
-- Returns TRUE if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.customer_profiles
    WHERE id = auth.uid()
    AND is_admin = TRUE
  );
$$;

-- RLS policy: Admins can view all customer profiles
CREATE POLICY "Admins can view all profiles"
  ON public.customer_profiles FOR SELECT
  USING (public.is_admin());

-- RLS policy: Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON public.customer_profiles FOR UPDATE
  USING (public.is_admin());

COMMENT ON COLUMN public.customer_profiles.is_admin IS 'TRUE if user has admin privileges. Must be set manually via SQL.';
COMMENT ON FUNCTION public.is_admin() IS 'Returns TRUE if current user is an admin';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 006_admin_roles.sql completed successfully';
  RAISE NOTICE 'Added is_admin column to customer_profiles';
  RAISE NOTICE 'Created is_admin() function for RLS policies';
  RAISE NOTICE 'Admin RLS policies applied';
  RAISE NOTICE '';
  RAISE NOTICE 'TO CREATE AN ADMIN USER:';
  RAISE NOTICE '  UPDATE customer_profiles SET is_admin = TRUE WHERE id = ''<user-uuid>'';';
END $$;
