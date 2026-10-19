# Supabase Setup Guide

This guide walks through setting up Supabase for the MIVO project, including creating the project, configuring environment variables, running migrations, and populating the database.

## Prerequisites

- A Supabase account (free tier works for development)
- Node.js and npm installed
- Git repository cloned locally

## Step 1: Create Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in project details:
   - **Name**: `mivo-dev` (or your preferred name)
   - **Database Password**: Generate a strong password and save it securely
   - **Region**: Choose closest to your location
   - **Pricing Plan**: Free (suitable for development)
4. Click "Create new project"
5. Wait for project provisioning (1-2 minutes)

## Step 2: Get API Credentials

Once your project is ready:

1. Go to **Project Settings** (gear icon in sidebar)
2. Navigate to **API** section
3. Copy the following values:
   - **Project URL** (looks like `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)

**IMPORTANT**: 
- Never commit these credentials to Git
- Never use the `service_role` key in frontend code
- The `anon` key is safe for client-side use (protected by RLS)

## Step 3: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your credentials:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. Verify the configuration:
   ```bash
   npm run dev
   ```
   
   You should see in the console:
   ```
   [Products Service] ✓ Supabase mode enabled
   ```

## Step 4: Run Database Migrations

The project includes three migrations that must be run in order:

### Migration 1: Initial Schema (001_init.sql)

Creates core database structure with UUID extension and helper functions.

1. Go to **SQL Editor** in Supabase Dashboard
2. Click **New Query**
3. Copy contents of `supabase/migrations/001_init.sql`
4. Paste into editor and click **Run**
5. Verify success message

### Migration 2: Catalogue Schema (002_catalogue_schema.sql)

Creates product catalogue tables with RLS policies.

1. Click **New Query** again
2. Copy contents of `supabase/migrations/002_catalogue_schema.sql`
3. Paste and **Run**
4. Verify success message

**What this creates**:
- `categories` table
- `products` table
- `product_images` table
- `product_variants` table
- RLS policies for read-only public access
- Constraints for data integrity

### Migration 3: Auth Profiles (003_auth_profiles.sql)

Creates customer profiles with automatic creation on signup.

1. Click **New Query**
2. Copy contents of `supabase/migrations/003_auth_profiles.sql`
3. Paste and **Run**
4. Verify success message

**What this creates**:
- `customer_profiles` table
- RLS policies for profile isolation
- Trigger to auto-create profile on user signup

## Step 5: Verify Migrations

Run these queries in SQL Editor to verify schema:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check policies exist
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

Expected output:
- 5 tables: `categories`, `products`, `product_images`, `product_variants`, `customer_profiles`
- All tables should have `rowsecurity = true`
- Multiple policies for each table

## Step 6: Populate Database with Sample Data

Use the data migration script to import products from JSON:

```bash
node scripts/migrate-data-to-supabase.js
```

**Before running, ensure**:
- `.env.local` has valid Supabase credentials
- Migrations are applied successfully
- You have the `service_role` key (only for this script, never commit it)

The script will:
1. Read `lib/data/products.json`
2. Create categories
3. Create products with variants and images
4. Report import results

**Expected output**:
```
✓ Imported 3 categories
✓ Imported 12 products
✓ Imported 48 variants
✓ Imported 36 images
```

## Step 7: Configure Authentication

### Email Settings

1. Go to **Authentication** → **Settings** → **Email Templates**
2. Customize email templates (optional):
   - Confirmation email
   - Magic link email
   - Password reset email
   - Invite user email

### Email Verification

Email verification is **required** by default in this project. Users must verify their email before accessing protected routes.

To configure:
1. Go to **Authentication** → **Settings**
2. Ensure **Enable email confirmations** is checked
3. Set **Site URL** to your production domain (e.g., `https://mivo.in`)
4. Add redirect URLs for development:
   - `http://localhost:3000/**`
   - `https://yourdomain.vercel.app/**`

### Auth Providers

By default, only email/password authentication is enabled. To add OAuth providers:

1. Go to **Authentication** → **Providers**
2. Enable desired providers (Google, GitHub, etc.)
3. Configure OAuth credentials for each provider
4. Add redirect URLs

## Step 8: Test Authentication Flow

1. Start development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/auth/register`

3. Create a test account:
   - Enter email and password
   - Submit form
   - Check email for confirmation link
   - Click confirmation link
   - Sign in at `/auth/login`

4. Verify protected routes work:
   - Navigate to `/account`
   - Should see account dashboard
   - Try `/account/profile` to edit profile

5. Test profile creation:
   - Check Supabase Dashboard → **Table Editor** → `customer_profiles`
   - Your user should have a profile row automatically created

## Step 9: Test RLS Policies

### Test Product Read Access (No Auth Required)

Run in SQL Editor:
```sql
-- Should return products (public read access)
SELECT * FROM products WHERE status = 'published';
```

### Test Profile Isolation (Auth Required)

1. Create two test users via registration
2. In SQL Editor, run:
   ```sql
   -- Should only return YOUR profile
   SELECT * FROM customer_profiles;
   ```

3. Verify each user can only see their own profile

### Test Write Protection

Try to insert a product (should fail):
```sql
-- Should be denied by RLS
INSERT INTO products (name, slug, category_id) 
VALUES ('Test', 'test', 'some-uuid');
```

Expected error: `new row violates row-level security policy`

## Step 10: Configure Storage (Optional - M4)

Storage setup is not required for M3 (catalogue + auth only). Storage will be configured in M4 when implementing product image uploads.

For reference, storage buckets needed:
- `product-images`: Public bucket for product photos
- `user-content`: Private bucket for custom order files

## Troubleshooting

### "Supabase is not configured" Message

**Symptom**: Console shows "Using JSON fallback mode"

**Solution**:
1. Check `.env.local` exists and has both variables
2. Verify URL starts with `https://` and contains `.supabase.co`
3. Verify anon key is not placeholder text
4. Restart dev server after changing `.env.local`

### Email Confirmation Not Received

**Symptom**: No email after registration

**Solution**:
1. Check spam folder
2. Go to **Authentication** → **Users** in dashboard
3. Find your user, click "..." → "Send confirmation email"
4. For development, you can manually confirm via dashboard

### RLS Policy Errors

**Symptom**: `new row violates row-level security policy`

**Solution**:
1. Verify migrations ran successfully
2. Check SQL Editor for policy definitions
3. Ensure you're authenticated (check session)
4. Review policy logic in migration files

### Profile Not Created on Signup

**Symptom**: User exists but no profile row

**Solution**:
1. Check trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`
2. Check function exists: `\df public.handle_new_user`
3. Manually create profile: `INSERT INTO customer_profiles (id, display_name) VALUES ('user-uuid', 'Name');`
4. Re-apply migration 003 if needed

### Migration Conflicts

**Symptom**: "relation already exists" errors

**Solution**:
1. Don't run migrations twice
2. If needed, drop tables in reverse order:
   ```sql
   DROP TABLE IF EXISTS customer_profiles CASCADE;
   DROP TABLE IF EXISTS product_variants CASCADE;
   DROP TABLE IF EXISTS product_images CASCADE;
   DROP TABLE IF EXISTS products CASCADE;
   DROP TABLE IF EXISTS categories CASCADE;
   ```
3. Re-run all migrations in order

## Production Checklist

Before deploying to production:

- [ ] Create production Supabase project (separate from dev)
- [ ] Configure production environment variables in Vercel
- [ ] Run migrations on production database
- [ ] Populate production database with real product data
- [ ] Set correct Site URL and redirect URLs
- [ ] Configure custom email templates with branding
- [ ] Enable rate limiting for auth endpoints
- [ ] Set up monitoring and alerts
- [ ] Configure database backups
- [ ] Review RLS policies for security
- [ ] Test authentication flow on production domain
- [ ] Verify email delivery in production

## Security Notes

**Environment Variables**:
- `NEXT_PUBLIC_*` variables are exposed to the browser
- Never put `service_role` key in `NEXT_PUBLIC_*` variables
- Keep `service_role` key secure and use only for admin scripts

**RLS Policies**:
- All tables have RLS enabled
- Products: Public read-only access
- Profiles: Users can only access their own data
- Admin operations require service role key

**Database Access**:
- Service layer uses browser client with RLS protection
- Direct database writes require proper RLS policies
- Server-side operations can use elevated privileges if needed

## Next Steps

After completing Supabase setup:

1. **M3 Complete**: Catalogue and auth are now functional
2. **M4 - Cart & Checkout**: Implement shopping cart and order placement
3. **M5 - User Orders**: Build order history and tracking
4. **M6 - Admin Portal**: Create admin dashboard for order management

## Support

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com/)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
