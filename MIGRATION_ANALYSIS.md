# Migration Analysis: 001_init.sql Function Dependencies

**Date**: 2026-10-19  
**Status**: ✅ SAFE TO PROCEED

## Functions Defined in 001_init.sql

### 1. handle_updated_at()
- **Purpose**: Automatically updates `updated_at` timestamp on row updates
- **Tables Referenced**: None (generic trigger function)
- **Called During Migration**: No
- **Risk**: ✅ None - Generic function, no table dependencies

### 2. generate_order_number()
```sql
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
```

**Analysis**:
- **Tables Referenced**: `public.orders` (does not exist in M3)
- **Called During Migration**: No - only defined, not executed
- **Called By**: Will be called when orders table exists (M4)
- **Behavior When Table Missing**: 
  - Function definition succeeds ✅
  - Function execution will fail with "relation 'public.orders' does not exist"
  - This is EXPECTED and SAFE - function won't be called until M4
- **Risk**: ✅ None - Function is declarative, not imperative

### 3. generate_quote_reference()
```sql
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
```

**Analysis**:
- **Tables Referenced**: `public.quote_requests` (does not exist in M3)
- **Called During Migration**: No - only defined, not executed
- **Called By**: Will be called when quote_requests table exists (M6+)
- **Behavior When Table Missing**: Same as generate_order_number()
- **Risk**: ✅ None - Function is declarative, not imperative

### 4. generate_quote_number(request_id UUID, revision_num INTEGER)
```sql
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
```

**Analysis**:
- **Tables Referenced**: `public.quote_requests` (does not exist in M3)
- **Called During Migration**: No - only defined, not executed
- **Called By**: Will be called when quote_requests table exists (M6+)
- **Behavior When Table Missing**: Same as above
- **Risk**: ✅ None - Function is declarative, not imperative

## Verification Queries

```sql
-- Check if functions exist after migration
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE 'generate_%';

-- Expected result:
-- generate_order_number    | FUNCTION
-- generate_quote_reference | FUNCTION  
-- generate_quote_number    | FUNCTION

-- Verify handle_updated_at exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'handle_updated_at';

-- Expected result:
-- handle_updated_at | FUNCTION
```

## Execution Order

**M3 (Current)**:
1. ✅ Run 001_init.sql - Creates functions (safe, no execution)
2. ✅ Run 002_catalogue_schema.sql - Creates catalogue tables
3. ✅ Run 003_auth_profiles.sql - Creates profile table

**M4 (Cart & Checkout)**:
1. Run 004_cart_schema.sql - Creates cart/orders tables
2. Now `generate_order_number()` can be called safely

**M6+ (Quotations)**:
1. Run 00X_quotes_schema.sql - Creates quote_requests table
2. Now `generate_quote_reference()` and `generate_quote_number()` can be called safely

## Conclusion

✅ **SAFE TO PROCEED** - All functions are declarative (CREATE FUNCTION) and do not execute during migration. They will only be called when their dependent tables exist in future milestones.

**No changes required to 001_init.sql.**

## PostgreSQL Function Behavior

When you define a function in PostgreSQL:
- The function definition is stored in the database catalog
- The function body is NOT executed during CREATE FUNCTION
- The function is only executed when explicitly called (e.g., as a trigger, default value, or direct invocation)
- If a function references a table that doesn't exist, the definition still succeeds
- The function will fail at RUNTIME if called before the table exists

This is standard PostgreSQL behavior and is intentional for forward compatibility.
