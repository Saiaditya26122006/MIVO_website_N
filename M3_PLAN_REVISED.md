# Milestone 3 Plan - REVISED (Awaiting Approval)

**Date**: 2026-10-19  
**Status**: Corrections Applied, Awaiting Final Approval

---

## KEY CORRECTIONS APPLIED

### 1. ✅ Dimension Storage - RESOLVED
**Decision**: Keep separate database columns (`length_mm`, `width_mm`, `height_mm`)

**Implementation**:
- Database schema unchanged (separate NUMERIC columns)
- Service layer maps DB columns ↔ TypeScript nested object
- No changes to frontend data model
- Explicit validation in migration script

```typescript
// Mapping functions
function mapVariantFromDB(dbRow: any): ProductVariant {
  return {
    id: dbRow.id,
    sku: dbRow.sku,
    sizeName: dbRow.size_name,
    dimensions: {
      lengthMm: dbRow.length_mm,
      widthMm: dbRow.width_mm,
      heightMm: dbRow.height_mm,
    },
    material: dbRow.material,
    colorOptions: dbRow.color_options,
    pricePaise: dbRow.price_paise,
    productionTimeHours: dbRow.production_time_hours,
    isDefault: dbRow.is_default,
  };
}

function mapVariantToDB(variant: ProductVariant) {
  return {
    id: variant.id,
    sku: variant.sku,
    size_name: variant.sizeName,
    length_mm: variant.dimensions.lengthMm,
    width_mm: variant.dimensions.widthMm,
    height_mm: variant.dimensions.heightMm,
    material: variant.material,
    color_options: variant.colorOptions,
    price_paise: variant.pricePaise,
    production_time_hours: variant.productionTimeHours,
    is_default: variant.isDefault,
  };
}
```

### 2. ✅ Product Authorization - CORRECTED
**Removed**: ❌ "Authenticated users can manage products" policy

**Correct Approach**:
- Public users: Read published products only (existing RLS)
- Customers: No product write permissions
- Admin: Separate authorization in M6
- Draft products: Hidden from all non-admin users

### 3. ✅ Storage Authorization - CORRECTED
**Removed**: ❌ Upload/update permissions for all authenticated users

**Correct Approach**:
```sql
-- ✅ Public read access (safe)
CREATE POLICY "Public read access to product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- ❌ NO write access for customers
-- Write access: Server-side processes or admin role only (M6)
```

### 4. ✅ Data Migration - EXPLICIT MAPPING

**Complete Field Mapping** (products table):
```typescript
// Application → Database
{
  id: product.id,                           // UUID → id
  slug: product.slug,                       // string → slug
  name: product.name,                       // string → name
  short_description: product.shortDescription,  // camelCase → snake_case
  description: product.description,         // string → description
  category_id: product.categoryId,          // camelCase → snake_case
  specifications: product.specifications,   // Record<string, string> → JSONB
  features: product.features,               // string[] → JSONB
  status: product.status,                   // 'draft' | 'published' | 'archived' → TEXT
  featured: product.featured,               // boolean → BOOLEAN
  made_to_order: product.madeToOrder,       // camelCase → snake_case
  created_at: product.createdAt,            // ISO string → TIMESTAMPTZ
}
```

**Validation Checks**:
- Foreign key: `category_id` must exist in `categories` table
- Unique constraints: `slug`, `sku` per variant
- Status: Must be one of 'draft', 'published', 'archived'
- Prices: Must be non-negative integers (paise)
- Dimensions: Must be positive numbers
- Primary image: Exactly one per product (enforced by partial unique index)
- Error handling: Script fails loudly on validation errors
- Idempotency: Check if data already exists before inserting

### 5. ✅ Migration History - PRESERVED
**Strategy**:
- ❌ Do NOT modify existing migrations if already applied
- ✅ Create new forward migrations for changes
- ✅ Document execution order: 001 → 002 → 003
- ✅ Include rollback instructions where possible

**New Migration**: `003_auth_profiles.sql` (ONLY new migration in M3)

**Modified Migration**: `002_catalogue_schema.sql` - Add constraints ONLY if not yet applied

### 6. ✅ Auth Security - HARDENED

**Profile Creation Trigger** (Hardened):
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public  -- Prevent schema injection attacks
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.customer_profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;  -- Don't block user creation on profile failure
END;
$$;
```

**Middleware Protection**:
```typescript
// Safe redirect handling
export async function middleware(request: NextRequest) {
  // ... session check ...
  
  if (request.nextUrl.pathname.startsWith('/account') && !session) {
    const redirectUrl = new URL('/auth/login', request.url);
    
    // Only preserve safe internal paths
    const returnPath = request.nextUrl.pathname;
    if (returnPath.startsWith('/account') && !returnPath.includes('..')) {
      redirectUrl.searchParams.set('redirect', returnPath);
    }
    
    return NextResponse.redirect(redirectUrl);
  }
  
  return response;
}
```

**Email Verification Flow**:
1. User registers → Supabase sends verification email
2. User sees "Check your email" page
3. User clicks link → Email confirmed
4. Protected features require verified email
5. Resend option with throttling (60s cooldown)
6. Expired link handling with clear error message

### 7. ✅ Testing Strategy - CORRECTED

**Unit Tests** (Mocked Supabase):
```typescript
// Mock Supabase client for isolated tests
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}));
```

**Integration Tests** (Real Supabase Dev Project):
```typescript
// Use actual development project
const supabase = createClient(); // With real credentials
const { data } = await supabase.from('products').select('*');
expect(data).toBeDefined();
```

**RLS Tests** (Multiple User Contexts):
```typescript
// Test 1: Unauthenticated user
const publicClient = createClient(); // No auth
const { data: products } = await publicClient
  .from('products')
  .select('*');
expect(products.every(p => p.status === 'published')).toBe(true);

// Test 2: User A profile isolation
const clientA = createClientWithAuth(userA);
const { data: profileA } = await clientA
  .from('customer_profiles')
  .select('*')
  .eq('id', userA.id);
expect(profileA).toBeDefined();

// Try to access User B's profile
const { data: profileB } = await clientA
  .from('customer_profiles')
  .select('*')
  .eq('id', userB.id);
expect(profileB).toBeNull(); // RLS blocks
```

### 8. ✅ Dual-Mode Architecture - CLARIFIED

**Configuration**:
```typescript
// lib/env.ts - explicit check
export function isSupabaseConfigured(): boolean {
  const url = env.supabase.url;
  const key = env.supabase.anonKey;
  
  // Both must be set AND not placeholder values
  return !!(
    url && 
    key && 
    url !== 'your_supabase_project_url' &&
    key !== 'your_supabase_anon_key' &&
    url.includes('supabase')
  );
}
```

**Service Selection**:
```typescript
// services/products.service.ts
import { isSupabaseConfigured } from '@/lib/env';
import * as jsonImpl from './products.service.json';
import * as supabaseImpl from './products.service.supabase';

export async function getProducts(filters?: ProductFilters) {
  if (isSupabaseConfigured()) {
    console.log('[Products Service] Using Supabase mode');
    return supabaseImpl.getProducts(filters);
  } else {
    console.log('[Products Service] Using JSON mode');
    return jsonImpl.getProducts(filters);
  }
}
```

**Guarantees**:
- ✅ JSON mode works without any Supabase variables
- ✅ Supabase mode only activated when fully configured
- ✅ No silent fallback to Supabase with incomplete config
- ✅ Clear console logging of which mode is active
- ✅ All M2 storefront features work in JSON mode

### 9. ✅ Milestone Boundaries - PRESERVED

**M3 Includes**:
- ✅ Catalogue database integration (Supabase)
- ✅ Customer authentication (Supabase Auth)
- ✅ Customer profiles with RLS
- ✅ Email verification (required)
- ✅ Protected routes (/account/*)
- ✅ Storage setup documentation
- ✅ Dual-mode service layer

**M3 Excludes**:
- ❌ Cart functionality (M4)
- ❌ Checkout process (M4)
- ❌ Order placement (M4)
- ❌ Custom quotations (M6)
- ❌ Admin portal (M6)
- ❌ Product write access (M6)
- ❌ Image upload UI (M6)
- ❌ Payment gateway (Deferred)

---

## CORRECTED SCHEMAS & POLICIES

### 003_auth_profiles.sql (NEW)

```sql
-- Customer Profiles Table
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  
  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'IN',
  
  -- Business (optional)
  company_name TEXT,
  gst_number TEXT,
  
  -- Metadata
  marketing_opt_in BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_customer_profiles_phone 
  ON public.customer_profiles(phone);
  
CREATE INDEX idx_customer_profiles_gst 
  ON public.customer_profiles(gst_number) 
  WHERE gst_number IS NOT NULL;

-- RLS Policies
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.customer_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.customer_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.customer_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trigger for updated_at
CREATE TRIGGER handle_customer_profiles_updated_at
  BEFORE UPDATE ON public.customer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- HARDENED: Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.customer_profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### 002_catalogue_schema.sql (CONSTRAINTS ADDITION)

**Add to existing migration** (if not yet applied):

```sql
-- Partial unique index: One primary image per product
CREATE UNIQUE INDEX idx_product_images_one_primary 
  ON public.product_images(product_id) 
  WHERE is_primary = TRUE;

-- Validate image URLs (basic check)
ALTER TABLE public.product_images 
  ADD CONSTRAINT check_image_url_format 
  CHECK (url ~ '^(https?://|/)');

-- Validate positive dimensions
ALTER TABLE public.product_variants
  ADD CONSTRAINT check_positive_length CHECK (length_mm > 0),
  ADD CONSTRAINT check_positive_width CHECK (width_mm > 0),
  ADD CONSTRAINT check_positive_height CHECK (height_mm > 0);

-- Validate non-negative prices
ALTER TABLE public.product_variants
  ADD CONSTRAINT check_nonnegative_price CHECK (price_paise >= 0);
```

**If migration already applied**: Create `004_add_constraints.sql` with above checks.

---

## MIGRATION EXECUTION STRATEGY

### Pre-Migration Checks

```sql
-- Check if migrations already applied
SELECT * FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('products', 'categories', 'customer_profiles');

-- If tables exist, skip migration or create new forward migration
```

### Execution Order

1. **001_init.sql**
   - ✅ Verified safe (functions don't execute, see MIGRATION_ANALYSIS.md)
   - Creates: Extensions, helper functions
   - No table dependencies

2. **002_catalogue_schema.sql** (+ constraints if needed)
   - Creates: categories, products, product_variants, product_images
   - Depends on: 001_init.sql (handle_updated_at function)
   - RLS: Public read access to published products

3. **003_auth_profiles.sql** (NEW)
   - Creates: customer_profiles
   - Depends on: 001_init.sql (handle_updated_at function)
   - Depends on: Supabase Auth (auth.users table exists by default)
   - RLS: Users can only access own profile

### Rollback Strategy

```sql
-- Rollback 003
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.customer_profiles CASCADE;

-- Rollback 002
DROP TABLE IF EXISTS public.product_images CASCADE;
DROP TABLE IF EXISTS public.product_variants CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;

-- Rollback 001
DROP FUNCTION IF EXISTS public.generate_quote_number(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.generate_quote_reference();
DROP FUNCTION IF EXISTS public.generate_order_number();
DROP FUNCTION IF EXISTS public.handle_updated_at();
DROP EXTENSION IF EXISTS pgcrypto;
DROP EXTENSION IF EXISTS "uuid-ossp";
```

---

## REQUIRED ENVIRONMENT VARIABLES

### .env.local (Development)

```env
# Application
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NODE_ENV=development

# Supabase Configuration (Public - safe for browser)
# Get these from: Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Service Role (Server-only - NEVER expose to browser)
# Get from: Supabase Dashboard → Settings → API → Service Role Key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Validation

```typescript
// Startup check
if (isSupabaseConfigured()) {
  console.log('✅ Supabase configured - using database mode');
} else {
  console.log('ℹ️ Supabase not configured - using JSON mode');
}
```

---

## TEST PLAN

### 1. RLS Policy Tests

```typescript
describe('RLS Policies', () => {
  test('unauthenticated users can read published products', async () => {
    const supabase = createClient(); // No auth
    const { data, error } = await supabase
      .from('products')
      .select('*');
    
    expect(error).toBeNull();
    expect(data.every(p => p.status === 'published')).toBe(true);
  });
  
  test('draft products hidden from public', async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('status', 'draft');
    
    expect(data).toHaveLength(0);
  });
  
  test('users cannot write to products', async () => {
    const supabase = createClientWithAuth(customerUser);
    const { error } = await supabase
      .from('products')
      .insert({ name: 'Test Product' });
    
    expect(error).toBeDefined();
    expect(error.message).toContain('permission denied');
  });
  
  test('users can only access own profile', async () => {
    const clientA = createClientWithAuth(userA);
    
    // Can read own profile
    const { data: ownProfile } = await clientA
      .from('customer_profiles')
      .select('*')
      .eq('id', userA.id);
    expect(ownProfile).toHaveLength(1);
    
    // Cannot read other user's profile
    const { data: otherProfile } = await clientA
      .from('customer_profiles')
      .select('*')
      .eq('id', userB.id);
    expect(otherProfile).toHaveLength(0);
  });
});
```

### 2. Authentication Flow Tests

```typescript
describe('Authentication', () => {
  test('registration creates user and profile', async () => {
    const { data, error } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'SecurePass123!',
      options: {
        data: { display_name: 'Test User' }
      }
    });
    
    expect(error).toBeNull();
    expect(data.user).toBeDefined();
    
    // Check profile was created
    const { data: profile } = await supabase
      .from('customer_profiles')
      .select('*')
      .eq('id', data.user.id);
    expect(profile).toHaveLength(1);
  });
  
  test('email verification required', async () => {
    // ... test verification flow
  });
  
  test('resend verification throttled', async () => {
    // ... test 60s cooldown
  });
});
```

### 3. Dual-Mode Tests

```typescript
describe('Dual-Mode Service Layer', () => {
  test('works in JSON mode', async () => {
    // Clear Supabase env
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    const products = await getProducts();
    expect(products).toHaveLength(10);
  });
  
  test('works in Supabase mode', async () => {
    // Set Supabase env
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
    
    const products = await getProducts();
    expect(products.length).toBeGreaterThan(0);
  });
  
  test('dimension mapping correct', async () => {
    const products = await getProducts();
    const variant = products[0].variants[0];
    
    expect(variant.dimensions).toBeDefined();
    expect(variant.dimensions.lengthMm).toBeGreaterThan(0);
    expect(variant.dimensions.widthMm).toBeGreaterThan(0);
    expect(variant.dimensions.heightMm).toBeGreaterThan(0);
  });
});
```

### 4. Build Verification

```bash
# These must ALL pass before M3 is complete
npm run lint            # 0 errors, 0 warnings
npx tsc --noEmit        # 0 errors
npm run test            # All tests passing
npm run build           # Successful production build
```

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Database Preparation
- [x] Investigate 001_init.sql dependencies (✅ Safe, see MIGRATION_ANALYSIS.md)
- [ ] Add constraints to 002_catalogue_schema.sql (if not applied)
- [ ] Create 003_auth_profiles.sql with hardened trigger
- [ ] Review all foreign keys and indexes

### Phase 2: Supabase Setup
- [ ] Create development Supabase project
- [ ] Configure environment variables
- [ ] Run migrations: 001 → 002 → 003
- [ ] Verify schema with SQL queries
- [ ] Test RLS policies manually
- [ ] Document setup steps with screenshots

### Phase 3: Service Layer
- [ ] Create services/products.service.supabase.ts
- [ ] Implement dimension mapping (DB ↔ TypeScript)
- [ ] Update services/products.service.ts for dual-mode
- [ ] Create data migration script with validation
- [ ] Test both JSON and Supabase modes

### Phase 4: Authentication
- [ ] Create auth UI components (LoginForm, RegisterForm, UserMenu)
- [ ] Create auth pages (/auth/login, /auth/register, /auth/verify-email)
- [ ] Implement middleware for protected routes
- [ ] Create account pages (/account, /account/profile)
- [ ] Update Navigation with user menu
- [ ] Test complete auth flows

### Phase 5: Storage & Documentation
- [ ] Document Supabase Storage setup (no implementation)
- [ ] Create SUPABASE_SETUP.md with step-by-step guide
- [ ] Update .env.example
- [ ] Document troubleshooting steps

### Phase 6: Testing & Verification
- [ ] Write and run RLS policy tests
- [ ] Write and run auth flow tests
- [ ] Write and run dual-mode tests
- [ ] Run lint, TypeScript check, tests, build
- [ ] Verify M2 storefront still works
- [ ] Document any limitations or issues

---

## CHANGES FROM ORIGINAL PLAN

| Issue | Original | Corrected |
|-------|----------|-----------|
| Dimension storage | "Use JSONB" | ✅ Keep separate columns, map in service |
| Product write access | "All authenticated users" | ❌ Removed - Admin only (M6) |
| Image upload access | "All authenticated users" | ❌ Removed - Server/admin only |
| Mapping strategy | "Supabase auto-converts" | ✅ Explicit field mapping with validation |
| Migration changes | "Modify existing files" | ✅ Preserve history, create forward migrations |
| Profile trigger | Basic implementation | ✅ Hardened with search_path and error handling |
| Test strategy | Mock Supabase | ✅ Real dev project for integration tests |
| Mode detection | "If URL exists" | ✅ Explicit validation with console logging |

---

## AWAITING APPROVAL

**Ready to proceed after approval of**:
1. ✅ Corrected RLS policies (no customer product write)
2. ✅ Corrected Storage policies (no customer image upload)
3. ✅ Explicit dimension mapping strategy
4. ✅ Data migration validation approach
5. ✅ Hardened profile security
6. ✅ Real integration test strategy
7. ✅ Dual-mode configuration clarity

**User to confirm**:
- [ ] All corrections are satisfactory
- [ ] Migration execution strategy is sound
- [ ] Test plan is comprehensive
- [ ] Ready to begin implementation

---

**Once approved, implementation will proceed incrementally with regular status updates.**
