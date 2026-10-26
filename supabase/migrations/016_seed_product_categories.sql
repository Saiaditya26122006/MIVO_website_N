-- ============================================================================
-- MIVO Product Categories Migration (Production-Safe)
-- Migration 016: Ensure business categories exist (idempotent)
-- Created: 2026-10-24
-- Revised: 2026-10-26
-- Dependencies: 002_catalogue_schema.sql
-- ============================================================================
-- This migration is safe to run against databases where:
-- - Categories already exist (no changes made)
-- - Legacy categories were already migrated (skips migration step)
-- - Fresh database (creates categories)
-- ============================================================================

-- ============================================================================
-- STEP 1: Verify Prerequisites
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'categories') THEN
    RAISE EXCEPTION 'Categories table does not exist. Run migration 002 first.';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
    RAISE EXCEPTION 'Products table does not exist. Run migration 002 first.';
  END IF;
  RAISE NOTICE '[Step 1/4] Prerequisites verified';
END $$;

-- ============================================================================
-- STEP 2: Detect Current State
-- ============================================================================
DO $$
DECLARE
  new_count INTEGER;
  name_conflicts INTEGER;
  slug_conflicts INTEGER;
BEGIN
  -- Count how many of the 5 target categories already exist
  SELECT COUNT(*) INTO new_count
  FROM public.categories
  WHERE id IN (
    'c1111111-1111-1111-1111-111111111111',
    'c2222222-2222-2222-2222-222222222222',
    'c3333333-3333-3333-3333-333333333333',
    'c4444444-4444-4444-4444-444444444444',
    'c5555555-5555-5555-5555-555555555555'
  );

  IF new_count = 5 THEN
    RAISE NOTICE '[Step 2/4] All 5 categories already exist. Migration already applied.';
    RETURN;
  END IF;

  -- Check for name conflicts (different UUID, same name)
  SELECT COUNT(*) INTO name_conflicts
  FROM public.categories
  WHERE name IN (
    'Desk & Workspace',
    'Gaming, Fandom & Collectibles',
    'Home & Everyday Utility',
    'Engineering & Robotics',
    'Personalised Products'
  )
  AND id NOT IN (
    'c1111111-1111-1111-1111-111111111111',
    'c2222222-2222-2222-2222-222222222222',
    'c3333333-3333-3333-3333-333333333333',
    'c4444444-4444-4444-4444-444444444444',
    'c5555555-5555-5555-5555-555555555555'
  );

  -- Check for slug conflicts
  SELECT COUNT(*) INTO slug_conflicts
  FROM public.categories
  WHERE slug IN (
    'desk-workspace',
    'gaming-fandom-collectibles',
    'home-everyday-utility',
    'engineering-robotics',
    'personalised-products'
  )
  AND id NOT IN (
    'c1111111-1111-1111-1111-111111111111',
    'c2222222-2222-2222-2222-222222222222',
    'c3333333-3333-3333-3333-333333333333',
    'c4444444-4444-4444-4444-444444444444',
    'c5555555-5555-5555-5555-555555555555'
  );

  IF name_conflicts > 0 THEN
    RAISE EXCEPTION 'Name conflicts detected: % categories with conflicting names exist. Manual resolution required.', name_conflicts;
  END IF;

  IF slug_conflicts > 0 THEN
    RAISE EXCEPTION 'Slug conflicts detected: % categories with conflicting slugs exist. Manual resolution required.', slug_conflicts;
  END IF;

  RAISE NOTICE '[Step 2/4] No conflicts detected. Will ensure % categories exist.', 5 - new_count;
END $$;

-- ============================================================================
-- STEP 3: Ensure Categories Exist (Idempotent)
-- ============================================================================
-- Uses ON CONFLICT (id) DO NOTHING to preserve existing data
INSERT INTO public.categories (id, name, slug, description, image_url, sort_order)
VALUES
  (
    'c1111111-1111-1111-1111-111111111111',
    'Desk & Workspace',
    'desk-workspace',
    'Organizers, desk accessories, cable management, and productivity tools for your workspace',
    '',
    1
  ),
  (
    'c2222222-2222-2222-2222-222222222222',
    'Gaming, Fandom & Collectibles',
    'gaming-fandom-collectibles',
    'Gaming accessories, figurines, collectible displays, and fan merchandise',
    '',
    2
  ),
  (
    'c3333333-3333-3333-3333-333333333333',
    'Home & Everyday Utility',
    'home-everyday-utility',
    'Practical items for daily life: organizers, kitchen tools, home improvement, and general utilities',
    '',
    3
  ),
  (
    'c4444444-4444-4444-4444-444444444444',
    'Engineering & Robotics',
    'engineering-robotics',
    'Technical components, robot parts, mechanical assemblies, and engineering prototypes',
    '',
    4
  ),
  (
    'c5555555-5555-5555-5555-555555555555',
    'Personalised Products',
    'personalised-products',
    'Custom items, personalized gifts, nameplates, and unique one-of-a-kind creations',
    '',
    5
  )
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  inserted_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO inserted_count
  FROM public.categories
  WHERE id IN (
    'c1111111-1111-1111-1111-111111111111',
    'c2222222-2222-2222-2222-222222222222',
    'c3333333-3333-3333-3333-333333333333',
    'c4444444-4444-4444-4444-444444444444',
    'c5555555-5555-5555-5555-555555555555'
  );

  IF inserted_count = 5 THEN
    RAISE NOTICE '[Step 3/4] All 5 categories present';
  ELSE
    RAISE EXCEPTION 'Category verification failed: expected 5 categories, found %', inserted_count;
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Verify Product Integrity
-- ============================================================================
DO $$
DECLARE
  total_products INTEGER;
  orphaned_products INTEGER;
  legacy_products INTEGER;
  unmapped_details TEXT;
BEGIN
  -- Count total products
  SELECT COUNT(*) INTO total_products
  FROM public.products;

  -- Check for orphaned products (invalid category_id)
  SELECT COUNT(*) INTO orphaned_products
  FROM public.products p
  LEFT JOIN public.categories c ON p.category_id = c.id
  WHERE c.id IS NULL;

  IF orphaned_products > 0 THEN
    RAISE EXCEPTION 'Data integrity error: % products reference non-existent categories', orphaned_products;
  END IF;

  -- Check for products still referencing legacy categories
  SELECT COUNT(*) INTO legacy_products
  FROM public.products
  WHERE category_id IN (
    md5('cat-001')::uuid,  -- legacy Functional Parts
    md5('cat-002')::uuid,  -- legacy Prototypes
    md5('cat-003')::uuid,  -- legacy Home & Office
    md5('cat-004')::uuid,  -- legacy Educational
    md5('cat-005')::uuid   -- legacy Custom Projects
  );

  IF legacy_products > 0 THEN
    -- Get details of unmapped products
    SELECT string_agg(format('ID: %s, Slug: %s, Category: %s', p.id, p.slug, p.category_id), '; ')
    INTO unmapped_details
    FROM public.products p
    WHERE p.category_id IN (
      md5('cat-001')::uuid,
      md5('cat-002')::uuid,
      md5('cat-003')::uuid,
      md5('cat-004')::uuid,
      md5('cat-005')::uuid
    );

    RAISE EXCEPTION 'Migration verification failed: % products still reference legacy categories. Products: %. These categories should have been migrated before running this migration.', legacy_products, unmapped_details;
  END IF;

  RAISE NOTICE '[Step 4/4] Verified: % products, 0 orphaned, 0 legacy references', total_products;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Migration 016 completed successfully';
  RAISE NOTICE 'All 5 business categories are present';
  RAISE NOTICE 'All products have valid category references';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

-- ============================================================================
-- Create Index (Idempotent)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
