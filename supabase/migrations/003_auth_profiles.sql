-- MIVO Authentication & Customer Profiles
-- Migration 003: Customer profiles with RLS
-- Created: 2026-10-19
-- Dependencies: 001_init.sql (handle_updated_at function)

-- Customer Profiles Table
-- Extends Supabase auth.users with additional customer data
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,

  -- Billing/Shipping Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'IN',

  -- Business Details (optional, for B2B customers)
  company_name TEXT,
  gst_number TEXT,

  -- Metadata
  marketing_opt_in BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_profiles_phone
  ON public.customer_profiles(phone);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_gst
  ON public.customer_profiles(gst_number)
  WHERE gst_number IS NOT NULL;

-- RLS Policies
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.customer_profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.customer_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (on first login if trigger failed)
CREATE POLICY "Users can insert own profile"
  ON public.customer_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trigger for updated_at
CREATE TRIGGER handle_customer_profiles_updated_at
  BEFORE UPDATE ON public.customer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- HARDENED: Auto-create profile on user signup
-- SECURITY: Set search_path to prevent schema injection attacks
-- STRATEGY: Log warnings but don't block user creation if profile fails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Attempt to create customer profile
  INSERT INTO public.customer_profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    -- Profile can be created later via INSERT policy
    RAISE WARNING 'Failed to create customer profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 003_auth_profiles.sql completed successfully';
  RAISE NOTICE 'Table created: customer_profiles';
  RAISE NOTICE 'RLS policies applied for profile isolation';
  RAISE NOTICE 'Trigger created: auto-create profile on signup (with error recovery)';
END $$;
