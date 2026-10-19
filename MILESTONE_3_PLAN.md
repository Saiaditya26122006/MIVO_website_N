# Milestone 3: Database Integration & Authentication - IMPLEMENTATION PLAN

**Status**: Awaiting Approval  
**Prepared**: 2026-10-19  
**Dependencies**: M1 (Foundation), M2 (Catalogue & Storefront)

---

## PHASE 1: AUDIT & DATABASE PREPARATION

### 1.1 Schema Audit Results

#### ✅ STRENGTHS
- **001_init.sql**: Clean, well-structured initialization
  - Extensions enabled: uuid-ossp, pgcrypto
  - Helper functions for updated_at timestamps
  - Order/quote number generators (for future milestones)
  
- **002_catalogue_schema.sql**: Solid catalogue foundation
  - Proper UUID primary keys
  - Correct foreign key relationships with CASCADE/RESTRICT
  - Appropriate indexes on slug, category, status, SKU
  - RLS policies for public read access to published products
  - Triggers for updated_at timestamps

- **TypeScript Types**: Well-defined, matches schema
  - Product.madeToOrder is always `true` (correct for MIVO)
  - Variants store dimensions as nested object
  - Prices in integer paise (correct)
  - Specifications as Record<string, string | undefined> (handles JSON variance)

#### ⚠️ IDENTIFIED ISSUES

**Issue 1: Schema/JSON Dimension Mismatch** ✅ RESOLVED
- **Migration**: product_variants has `length_mm`, `width_mm`, `height_mm` as separate columns
- **JSON**: Uses nested object `dimensions: { lengthMm, widthMm, heightMm }`
- **TypeScript**: Expects nested dimensions object
- **Impact**: Direct JSON→DB migration will fail without mapping
- **Solution**: Map between formats in service layer (see Decision 1)

**Issue 2: Color Options Storage**
- **Migration**: `color_options JSONB DEFAULT '[]'`
- **JSON**: `colorOptions: string[]`
- **TypeScript**: `colorOptions: string[]`
- **Impact**: camelCase vs snake_case, but Supabase handles conversion
- **Fix Required**: None (Supabase PostgREST auto-converts)

**Issue 3: Missing Image URL Validation**
- **Migration**: `url TEXT NOT NULL` has no format constraint
- **Risk**: Invalid URLs could be stored
- **Fix Required**: Add CHECK constraint OR handle at application layer

**Issue 4: No Unique Constraint on Primary Images**
- **Migration**: Multiple images can have `is_primary = TRUE` for same product
- **Risk**: Ambiguous primary image selection
- **Fix Required**: Add partial unique index OR application-level validation

**Issue 5: Migration References Future Tables** ⚠️ REQUIRES INVESTIGATION
- **001_init.sql**: Contains functions referencing `orders` and `quote_requests` tables
- **Impact**: Functions reference tables that don't exist yet
- **Risk**: Unknown - requires verification of how functions are used
- **Action Required**: 
  1. Inspect all function definitions in 001_init.sql
  2. Verify if functions are called during migration
  3. Check if functions fail gracefully when tables don't exist
  4. Document dependencies and execution order
  5. Do NOT dismiss as "low risk" without verification

**Issue 6: Missing Customer Profile Schema**
- **Current**: No customer profile table in migrations
- **Required for M3**: Customer profiles table to store additional user data
- **Fix Required**: New migration `003_auth_profiles.sql`

**Issue 7: Specifications Type Inconsistency**
- **TypeScript**: `Record<string, string | undefined>` allows undefined values
- **Database**: JSONB allows any JSON structure
- **Risk**: Inconsistent specification keys across products
- **Fix**: Document expected specification keys OR add validation

#### 🔧 REQUIRED CHANGES BEFORE MIGRATION

**Priority 1 (Blocking):**
1. Create `003_auth_profiles.sql` for customer profiles
2. ✅ Dimension storage strategy DECIDED: Keep separate DB columns (length_mm, width_mm, height_mm), map to/from TypeScript nested dimensions object in service layer

**Priority 2 (Important):**
3. Add unique constraint on `(product_id, is_primary)` WHERE `is_primary = TRUE` for product_images
4. Add CHECK constraint on image URLs (basic format validation)

**Priority 3 (Nice-to-have):**
5. Add enum constraint on product status instead of TEXT CHECK
6. Add CHECK constraints on positive dimensions/prices
7. Document specification key standards

---

## PHASE 2: CATALOGUE DATABASE INTEGRATION

### 2.1 Proposed Architecture

```
┌─────────────────────────────────────────────────────┐
│  Application Layer (app/, components/)              │
│  - No changes to existing UI components             │
│  - Same routes: /, /explore, /product/[slug]        │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Service Layer (services/products.service.ts)       │
│  - DUAL MODE: JSON (dev) / Supabase (production)    │
│  - Env check: isSupabaseConfigured()                │
│  - Same function signatures (no breaking changes)   │
└─────────────────────────────────────────────────────┘
                        ↓
          ┌─────────────┴─────────────┐
          ↓                           ↓
┌──────────────────────┐    ┌──────────────────────┐
│  JSON Data Source    │    │  Supabase Source     │
│  (lib/data/*.json)   │    │  (PostgreSQL + RLS)  │
│  - No credentials    │    │  - Requires config   │
│  - Instant startup   │    │  - Production ready  │
└──────────────────────┘    └──────────────────────┘
```

**Mode Selection Logic:**
```typescript
// In services/products.service.ts
const USE_SUPABASE = isSupabaseConfigured();

export async function getProducts(filters?: ProductFilters) {
  if (USE_SUPABASE) {
    return getProductsFromSupabase(filters);
  } else {
    return getProductsFromJSON(filters);
  }
}
```

### 2.2 Implementation Strategy

**Step 1: Create Supabase-backed functions**
- New file: `services/products.service.supabase.ts`
- Implements: `getProductsFromSupabase()`, `getFeaturedProductsFromSupabase()`, etc.
- Uses: `lib/supabase/server.ts` for server-side queries
- Respects: RLS policies (reads only published products)

**Step 2: Update main service to delegate**
- Keep existing JSON functions (rename with `FromJSON` suffix)
- Add mode detection logic
- Delegate to appropriate implementation
- No changes to function signatures

**Step 3: Add database indexes for performance**
- Full-text search index on products (name, description)
- Composite index for (category_id, status, featured)
- GIN index for JSONB fields (specifications, features)

**Step 4: Implement RLS policies**
```sql
-- Public read access (already in 002_catalogue_schema.sql)
CREATE POLICY "Published products are viewable by everyone"
  ON products FOR SELECT
  USING (status = 'published');

-- ❌ REMOVED - Do NOT grant product write access to all authenticated users
-- Admin write access will be designed separately in M6 with proper authorization
-- For now, only public read access is enabled (defined in 002_catalogue_schema.sql)
```

**Step 5: Test RLS policies**
- Verify unauthenticated users can read published products
- Verify draft/archived products are hidden from public
- Verify customers CANNOT write to products table
- Verify profile isolation (users can only access own profile)

### 2.3 Data Migration Script

**File**: `scripts/migrate-json-to-supabase.ts`

```typescript
/**
 * One-time migration script to populate Supabase with JSON data
 * Run manually after Supabase project setup
 */
import { createAdminClient } from '@/lib/supabase/admin';
import categoriesData from '@/lib/data/categories.json';
import productsData from '@/lib/data/products.json';

async function migrateData() {
  const supabase = createAdminClient();
  
  // 1. Insert categories
  console.log('Migrating categories...');
  const { error: catError } = await supabase
    .from('categories')
    .insert(categoriesData);
  
  if (catError) throw catError;
  
  // 2. Insert products
  console.log('Migrating products...');
  for (const product of productsData) {
    // Insert product
    const { data: productRow, error: prodError } = await supabase
      .from('products')
      .insert({
        id: product.id,
        slug: product.slug,
        name: product.name,
        short_description: product.shortDescription,
        description: product.description,
        category_id: product.categoryId,
        specifications: product.specifications,
        features: product.features,
        status: product.status,
        featured: product.featured,
        made_to_order: product.madeToOrder,
        created_at: product.createdAt,
      })
      .select()
      .single();
    
    if (prodError) throw prodError;
    
    // Insert images
    const { error: imgError } = await supabase
      .from('product_images')
      .insert(
        product.images.map(img => ({
          id: img.id,
          product_id: product.id,
          url: img.url,
          alt_text: img.altText,
          display_order: img.displayOrder,
          is_primary: img.isPrimary,
        }))
      );
    
    if (imgError) throw imgError;
    
    // Insert variants
    const { error: varError } = await supabase
      .from('product_variants')
      .insert(
        product.variants.map(v => ({
          id: v.id,
          product_id: product.id,
          sku: v.sku,
          size_name: v.sizeName,
          dimensions: v.dimensions, // Store as JSONB
          material: v.material,
          color_options: v.colorOptions,
          price_paise: v.pricePaise,
          production_time_hours: v.productionTimeHours,
          is_default: v.isDefault,
        }))
      );
    
    if (varError) throw varError;
  }
  
  console.log('Migration complete!');
}
```

---

## PHASE 3: CUSTOMER AUTHENTICATION & ACCOUNTS

### 3.1 Database Schema

**New Migration**: `003_auth_profiles.sql`

```sql
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
CREATE INDEX idx_customer_profiles_phone ON public.customer_profiles(phone);
CREATE INDEX idx_customer_profiles_gst ON public.customer_profiles(gst_number) WHERE gst_number IS NOT NULL;

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

-- Users can insert their own profile (on first login)
CREATE POLICY "Users can insert own profile"
  ON public.customer_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trigger for updated_at
CREATE TRIGGER handle_customer_profiles_updated_at
  BEFORE UPDATE ON public.customer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to auto-create profile on user signup (HARDENED)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
-- Set a secure search_path to prevent malicious schema attacks
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.customer_profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE WARNING 'Failed to create customer profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### 3.2 Authentication Flow

**Registration Flow:**
```
1. User fills registration form
   ↓
2. Call Supabase Auth signUp()
   - Email + Password
   - Metadata: { display_name, phone }
   ↓
3. Supabase sends verification email
   ↓
4. Trigger creates customer_profiles row
   ↓
5. Redirect to /account/verify-email
```

**Login Flow:**
```
1. User enters email + password
   ↓
2. Call Supabase Auth signInWithPassword()
   ↓
3. Check session validity
   ↓
4. Redirect to /account or original destination
```

**Session Management:**
```
- Supabase SSR handles cookie-based sessions
- Middleware checks auth status for protected routes
- Auto-refresh on token expiry
- Logout clears session cookies
```

### 3.3 Protected Routes

**New Routes:**
- `/auth/login` - Login page
- `/auth/register` - Registration page
- `/auth/verify-email` - Email verification notice
- `/auth/reset-password` - Password reset request
- `/account` - Customer dashboard (protected)
- `/account/profile` - Edit profile (protected)
- `/account/orders` - Order history (protected, placeholder for M4)

**Middleware**: `middleware.ts`
```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );
  
  const { data: { session } } = await supabase.auth.getSession();
  
  // Protect /account routes
  if (request.nextUrl.pathname.startsWith('/account')) {
    if (!session) {
      const redirectUrl = new URL('/auth/login', request.url);
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }
  
  // Redirect authenticated users away from auth pages
  if (request.nextUrl.pathname.startsWith('/auth/') && session) {
    if (!request.nextUrl.pathname.includes('verify-email')) {
      return NextResponse.redirect(new URL('/account', request.url));
    }
  }
  
  return response;
}

export const config = {
  matcher: ['/account/:path*', '/auth/:path*'],
};
```

### 3.4 UI Components

**New Components:**
- `components/auth/LoginForm.tsx` - Email/password login
- `components/auth/RegisterForm.tsx` - Registration with validation
- `components/auth/AuthGuard.tsx` - Client-side route protection
- `components/auth/UserMenu.tsx` - Dropdown in navigation (Account, Logout)
- `components/account/ProfileForm.tsx` - Edit profile fields

**Updated Components:**
- `components/Navigation.tsx` - Add user menu when authenticated

### 3.5 Error Handling

**Auth Errors:**
```typescript
// Map Supabase errors to user-friendly messages
const AUTH_ERROR_MESSAGES = {
  'Invalid login credentials': 'Incorrect email or password',
  'Email not confirmed': 'Please verify your email before logging in',
  'User already registered': 'An account with this email already exists',
  'Password should be at least 6 characters': 'Password must be at least 6 characters',
};

// Session expiry handling
function handleAuthError(error: any) {
  if (error.message === 'Auth session missing!') {
    // Redirect to login with return URL
    window.location.href = `/auth/login?redirect=${window.location.pathname}`;
  }
}
```

**Loading States:**
- Show skeleton loaders during auth checks
- Disable form submissions during processing
- Show spinner on login/register buttons

---

## PHASE 4: PRODUCT IMAGE INFRASTRUCTURE

### 4.1 Supabase Storage Setup

**Bucket Configuration:**
```sql
-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true);

-- Storage policies
CREATE POLICY "Public read access to product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- ❌ REMOVED - Do NOT grant image upload/update to all authenticated users
-- Write access restricted to server-side processes or admin role (M6)
-- Customers should NOT be able to upload or modify product images
```

**Storage Structure:**
```
product-images/
├── products/
│   ├── {product-slug}/
│   │   ├── main-1.webp
│   │   ├── main-2.webp
│   │   └── thumbnail.webp
├── categories/
│   └── {category-slug}.webp
└── services/
    ├── 3d-printing.webp
    ├── cad-design.webp
    ├── prototyping.webp
    └── custom-parts.webp
```

### 4.2 Image Handling Strategy

**Development Mode (Current):**
- Continue using placeholder SVGs in `/public/placeholders/`
- Product images: `/placeholders/product-{name}.svg`
- Category images: `/placeholders/category-{slug}.svg`
- Service images: `/placeholders/service-{name}.svg`

**Production Mode (After M3):**
- Replace placeholder URLs with Supabase Storage URLs
- Format: `https://{project-id}.supabase.co/storage/v1/object/public/product-images/products/{slug}/main-1.webp`
- Next.js Image component handles optimization

**Migration Path:**
```typescript
// In product images
function getImageUrl(product: Product, imageIndex: number): string {
  const image = product.images[imageIndex];
  
  // If URL starts with /placeholders/, use as-is
  if (image.url.startsWith('/placeholders/')) {
    return image.url;
  }
  
  // Otherwise, it's a Supabase Storage URL
  return image.url;
}
```

### 4.3 Image Upload Utility (For Admin Portal - Future)

**File**: `lib/storage/uploadProductImage.ts`
```typescript
import { createAdminClient } from '@/lib/supabase/admin';
import sharp from 'sharp';

export async function uploadProductImage(
  productSlug: string,
  file: File,
  imageType: 'main' | 'thumbnail'
): Promise<string> {
  const supabase = createAdminClient();
  
  // Optimize image with sharp
  const buffer = await file.arrayBuffer();
  const optimized = await sharp(Buffer.from(buffer))
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();
  
  // Upload to Supabase Storage
  const fileName = `products/${productSlug}/${imageType}-${Date.now()}.webp`;
  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(fileName, optimized, {
      contentType: 'image/webp',
      upsert: false,
    });
  
  if (error) throw error;
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from('product-images')
    .getPublicUrl(fileName);
  
  return urlData.publicUrl;
}
```

**Note**: Image upload functionality is for documentation only in M3. Actual admin portal implementation is deferred to M6 (Admin Portal).

---

## TESTING PLAN

### Test 1: RLS Policy Verification

**Test Cases:**
```typescript
// Test 1.1: Unauthenticated user can read published products
async function testPublicProductAccess() {
  const supabase = createClient(); // Browser client, no auth
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('status', 'published');
  
  expect(error).toBeNull();
  expect(data).toHaveLength(10); // All published products
}

// Test 1.2: Unauthenticated user cannot read draft products
async function testDraftProductsHidden() {
  const supabase = createClient();
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('status', 'draft');
  
  expect(data).toHaveLength(0); // RLS filters out drafts
}

// Test 1.3: User can only read own profile
async function testProfileIsolation() {
  // Login as user A
  const supabaseA = createClientWithAuth(userA);
  const { data: profileA } = await supabaseA
    .from('customer_profiles')
    .select('*')
    .eq('id', userA.id)
    .single();
  
  expect(profileA).toBeDefined();
  
  // Try to read user B's profile
  const { data: profileB } = await supabaseA
    .from('customer_profiles')
    .select('*')
    .eq('id', userB.id)
    .single();
  
  expect(profileB).toBeNull(); // RLS blocks access
}
```

### Test 2: Authentication Flow

**Test Cases:**
- Registration with valid email/password
- Registration with duplicate email (should fail)
- Login with correct credentials
- Login with incorrect password (should fail)
- Password reset email request
- Email verification flow
- Session persistence across page loads
- Logout clears session

### Test 3: Dual-Mode Service Layer

**Test Cases:**
```typescript
// Test 3.1: JSON mode when Supabase not configured
async function testJSONMode() {
  // Clear Supabase env vars
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  const products = await getProducts();
  expect(products).toHaveLength(10);
  expect(products[0].name).toBe('Modular Desk Organizer');
}

// Test 3.2: Supabase mode when configured
async function testSupabaseMode() {
  // Set Supabase env vars
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
  
  const products = await getProducts();
  expect(products.length).toBeGreaterThan(0);
  // Products should come from database
}
```

### Test 4: Protected Routes

**Test Cases:**
- `/account` redirects to login when not authenticated
- `/account` accessible when authenticated
- `/auth/login` redirects to `/account` when already authenticated
- Redirect parameter preserved after login

### Test 5: Build Verification

**Commands:**
```bash
npm run lint       # Must pass with 0 errors
npx tsc --noEmit   # Must pass with 0 errors
npm run test       # Must pass all tests
npm run build      # Must build successfully
```

---

## IMPLEMENTATION SEQUENCE

### Phase 1: Database Preparation (Day 1)
1. ✅ Audit existing migrations (COMPLETE)
2. Create `003_auth_profiles.sql`
3. Update `002_catalogue_schema.sql` to use `dimensions JSONB`
4. Add unique constraint on primary images
5. Document migration dependencies

### Phase 2: Supabase Project Setup (Day 1-2)
1. Wait for user to create Supabase project (or provide credentials)
2. Document setup steps in `SUPABASE_SETUP.md`
3. Run migrations in order: 001 → 002 → 003
4. Verify migrations with manual SQL queries
5. Run data migration script to populate with JSON data

### Phase 3: Service Layer Integration (Day 2-3)
1. Create `services/products.service.supabase.ts`
2. Update `services/products.service.ts` with dual-mode logic
3. Test both JSON and Supabase modes
4. Verify existing storefront still works
5. Add search optimization (full-text indexes)

### Phase 4: Authentication Implementation (Day 3-4)
1. Create auth UI components (LoginForm, RegisterForm)
2. Create auth pages (/auth/login, /auth/register)
3. Implement middleware for protected routes
4. Create account dashboard page
5. Create profile editing page
6. Add user menu to navigation
7. Test auth flows

### Phase 5: Testing & Verification (Day 4-5)
1. Test RLS policies with different user identities
2. Test authentication flows (register, login, logout)
3. Test protected routes and redirects
4. Run automated tests
5. Run build verification
6. Document known issues/limitations

### Phase 6: Documentation (Day 5)
1. Update README with Supabase setup steps
2. Document dual-mode configuration
3. Document RLS policies
4. Create troubleshooting guide
5. Update .env.example with all required variables

---

## SUPABASE PROJECT SETUP

### Required Environment Variables

```env
# .env.local (add these after Supabase project creation)

# Supabase Configuration (Public - safe for browser)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Supabase Service Role (Server-only - NEVER expose to browser)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Setup Steps

**Option A: User Creates Project**
1. Go to https://supabase.com/dashboard
2. Create new project
3. Choose region (India - Mumbai recommended)
4. Set database password (store securely)
5. Wait for project initialization (~2 minutes)
6. Copy URL and anon key from Settings → API
7. Copy service role key from Settings → API
8. Provide keys to implementation

**Option B: User Provides Existing Project**
1. Ensure project has no conflicting tables
2. Provide URL, anon key, and service role key
3. Confirm permission to run migrations

### Migration Execution

```bash
# Option 1: Supabase CLI (recommended)
npx supabase db push

# Option 2: Manual SQL execution
# 1. Open Supabase Dashboard → SQL Editor
# 2. Copy contents of supabase/migrations/001_init.sql
# 3. Run SQL
# 4. Repeat for 002_catalogue_schema.sql
# 5. Repeat for 003_auth_profiles.sql
```

### Data Population

```bash
# After migrations, run data migration script
npx tsx scripts/migrate-json-to-supabase.ts
```

---

## EXPLICIT EXCLUSIONS

**NOT in Milestone 3:**
- ❌ Cart functionality (M4)
- ❌ Checkout process (M4)
- ❌ Order placement (M4)
- ❌ Payment gateway integration (M5+)
- ❌ Admin portal (M6)
- ❌ Custom quotation workflow (M6)
- ❌ Email notifications (M6)
- ❌ SMS notifications (Future)
- ❌ Product image uploads (M6 admin portal)
- ❌ Real product photography (Asset creation, not development)

**Minimal Shared Foundations Allowed:**
- ✅ Customer profiles table (required for auth)
- ✅ Auth session handling (required for protected routes)
- ✅ RLS policy framework (required for data security)
- ✅ Storage bucket setup (documentation only, no admin UI)

---

## BLOCKERS & DECISIONS REQUIRED

### Decision 1: Dimension Storage Strategy ✅ APPROVED

**DECISION**: Use separate database columns (Option B)

**Rationale**:
- Database uses: `length_mm`, `width_mm`, `height_mm` as separate NUMERIC columns
- Frontend expects: nested `dimensions: { lengthMm, widthMm, heightMm }` object
- **Solution**: Map between formats in the service layer

**Implementation**:
```typescript
// In services/products.service.supabase.ts
function mapVariantFromDB(dbVariant: any): ProductVariant {
  return {
    ...dbVariant,
    dimensions: {
      lengthMm: dbVariant.length_mm,
      widthMm: dbVariant.width_mm,
      heightMm: dbVariant.height_mm,
    },
    // Remove flat fields
    length_mm: undefined,
    width_mm: undefined,
    height_mm: undefined,
  };
}

function mapVariantToDB(variant: ProductVariant): any {
  return {
    ...variant,
    length_mm: variant.dimensions.lengthMm,
    width_mm: variant.dimensions.widthMm,
    height_mm: variant.dimensions.heightMm,
    dimensions: undefined, // Remove nested object
  };
}
```

**Benefits**:
- ✅ Better query performance (can filter by specific dimensions)
- ✅ Stronger database-level validation
- ✅ Frontend data model unchanged
- ✅ Clear separation of concerns (DB schema vs API contract)

### Decision 2: Supabase Project Setup ✅ APPROVED

**DECISION**: Create during M3 implementation (Option B)

**Approach**:
1. Start implementation with existing JSON mode
2. Create dedicated Supabase development project mid-milestone
3. Apply migrations and verify schema
4. Test both modes (JSON and Supabase)
5. Document all setup steps clearly

**Key Requirements**:
- ✅ Frontend development works without Supabase credentials
- ✅ Never claim migrations applied without verification
- ✅ Document exact setup steps with screenshots
- ✅ Use development project, not production credentials
- ✅ Test migration rollback if needed

### Decision 3: Auth Email Verification ✅ APPROVED

**DECISION**: Required (Option A) - Use Supabase Auth built-in verification

**Implementation Requirements**:
1. **Registration Flow**:
   - User submits registration form
   - Supabase Auth sends verification email
   - Show "Check your email" page with clear instructions
   - User clicks verification link in email

2. **Verification States**:
   - ✅ Verified: Full access to account features
   - ⏳ Pending: Limited access, show verification banner
   - ❌ Expired: Show "Resend verification email" option
   - ❌ Invalid link: Show error with resend option

3. **Error Handling**:
   - Clear messages for each error state
   - "Resend verification email" button
   - Handle expired links gracefully
   - Countdown timer before allowing resend (prevent spam)

4. **Protected Routes**:
   - Login works for unverified users
   - Account dashboard shows verification banner
   - Order placement blocked until verified (M4)
   - Profile editing allowed but with warning

**Do NOT**:
- ❌ Create custom token system
- ❌ Store verification tokens in database
- ❌ Bypass Supabase Auth verification
- Use Supabase's built-in email verification flow

### Decision 4: Placeholder Image Timing ✅ APPROVED

**DECISION**: Keep placeholders for now (Option A)

**Requirements**:
1. **Current State**:
   - All product images: `/placeholders/product-*.svg`
   - All category images: `/placeholders/category-*.svg`
   - All service images: `/placeholders/service-*.svg`
   - Each clearly labeled "DEMO IMAGE" in alt text

2. **M3 Deliverables**:
   - ✅ Supabase Storage bucket created and configured
   - ✅ Storage policies documented and tested
   - ✅ Image upload utility documented (for future admin portal)
   - ✅ Migration path from placeholders to real images documented
   - ❌ NO requirement for real product photography
   - ❌ NO admin upload UI (deferred to M6)

3. **Clear Labeling**:
   ```json
   {
     "url": "/placeholders/product-desk-organizer-1.svg",
     "altText": "Modular desk organizer with multiple compartments - DEMO IMAGE"
   }
   ```

4. **Future Migration Path**:
   - Replace placeholder URLs with Supabase Storage URLs
   - No frontend code changes required
   - Admin portal will handle uploads (M6)

---

## ACCEPTANCE CRITERIA

### ✅ M3 is COMPLETE when:

**Database:**
- [ ] All three migrations (001, 002, 003) run successfully on Supabase
- [ ] Data migration script populates database with JSON demo data
- [ ] RLS policies tested and working
- [ ] Customer profiles table created and tested

**Service Layer:**
- [ ] Dual-mode configuration works (JSON or Supabase)
- [ ] All catalogue functions (getProducts, getProductBySlug, etc.) work with both modes
- [ ] Supabase queries return correct data with proper filtering/sorting
- [ ] No breaking changes to existing UI components

**Authentication:**
- [ ] Registration flow works (signup, email verification)
- [ ] Login/logout works
- [ ] Session persistence works
- [ ] Protected routes redirect correctly
- [ ] User can view/edit own profile
- [ ] User cannot access other users' profiles

**Storefront:**
- [ ] Homepage loads and displays featured products
- [ ] /explore page works with search/filter/sort
- [ ] /product/[slug] page displays product details
- [ ] Navigation shows user menu when authenticated
- [ ] All existing features from M2 still work

**Quality:**
- [ ] ESLint: 0 errors, 0 warnings
- [ ] TypeScript: 0 errors
- [ ] Tests: All passing
- [ ] Build: Successful production build
- [ ] RLS tests: Pass with different user identities

**Documentation:**
- [ ] SUPABASE_SETUP.md created with step-by-step instructions
- [ ] .env.example updated with all required variables
- [ ] Migration dependencies documented
- [ ] Dual-mode configuration documented
- [ ] Known limitations documented

---

## ESTIMATED EFFORT

- **Phase 1 (Audit & Preparation)**: 4 hours
- **Phase 2 (Supabase Setup)**: 2 hours (user) + 1 hour (verification)
- **Phase 3 (Service Layer)**: 8 hours
- **Phase 4 (Authentication)**: 12 hours
- **Phase 5 (Testing)**: 6 hours
- **Phase 6 (Documentation)**: 3 hours

**Total**: ~36 hours (5 working days)

---

## NEXT STEPS

1. ✅ Review this plan
2. ⏳ Approve or request revisions
3. ⏳ Decide on dimension storage strategy (Decision 1)
4. ⏳ Decide on Supabase project timing (Decision 2)
5. ⏳ Confirm auth email verification requirement (Decision 3)
6. ⏳ Confirm placeholder image timing (Decision 4)
7. ⏳ Proceed with implementation

**Awaiting your approval to proceed.**
