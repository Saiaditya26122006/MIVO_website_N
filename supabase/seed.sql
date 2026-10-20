-- MIVO Catalogue Seed Data
-- Repeatable: uses ON CONFLICT to skip existing rows.
-- Deterministic UUIDs derived from the JSON source IDs via uuid_generate_v5
-- using the DNS namespace as a stable base (not semantically meaningful,
-- just a constant seed for reproducibility).

-- Helper: generate a deterministic UUID from a text key.
-- Uses md5 to produce a stable v4-format UUID from the source ID.
CREATE OR REPLACE FUNCTION pg_temp.stable_uuid(source_id TEXT)
RETURNS UUID AS $$
  SELECT (md5(source_id)::uuid);
$$ LANGUAGE sql IMMUTABLE;

-- =============================================
-- CATEGORIES (5)
-- =============================================
INSERT INTO public.categories (id, name, slug, description, image_url, sort_order, created_at, updated_at)
VALUES
  (pg_temp.stable_uuid('cat-001'), 'Functional Parts',  'functional-parts', 'Practical 3D printed components for everyday use and mechanical applications', '/placeholders/category-functional.svg', 1, NOW(), NOW()),
  (pg_temp.stable_uuid('cat-002'), 'Prototypes',        'prototypes',        'Rapid prototyping for product development and concept validation',              '/placeholders/category-prototypes.svg', 2, NOW(), NOW()),
  (pg_temp.stable_uuid('cat-003'), 'Home & Office',     'home-office',       'Organizers, holders, and accessories for your space',                           '/placeholders/category-home.svg',       3, NOW(), NOW()),
  (pg_temp.stable_uuid('cat-004'), 'Educational',       'educational',       'Learning tools, models, and demonstration pieces',                              '/placeholders/category-educational.svg',4, NOW(), NOW()),
  (pg_temp.stable_uuid('cat-005'), 'Custom Projects',   'custom-projects',   'Unique designs and one-of-a-kind creations',                                    '/placeholders/category-custom.svg',     5, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- PRODUCTS (10)
-- =============================================
INSERT INTO public.products (id, slug, name, short_description, description, category_id, specifications, features, status, featured, made_to_order, created_at, updated_at)
VALUES
  -- prod-001: Modular Desk Organizer
  (pg_temp.stable_uuid('prod-001'), 'desk-organizer-modular', 'Modular Desk Organizer',
   'Customizable desk organization system with interlocking modules',
   E'A versatile desk organizer system that adapts to your needs. Features interlocking modules for pens, cables, small tools, and office supplies. Made to order in your choice of durable materials.\n\nDEMO PRODUCT - Sample data for development purposes.',
   pg_temp.stable_uuid('cat-003'),
   '{"Material Options":"PLA, PETG","Layer Height":"0.2mm","Infill":"20%","Finish":"Standard","Assembly":"Snap-fit, no tools required"}'::jsonb,
   '["Modular interlocking design","Multiple compartment sizes","Stackable configuration","Cable management channels","Anti-slip rubber feet included"]'::jsonb,
   'published', true, true, '2026-10-01T10:00:00Z', NOW()),

  -- prod-002: Electronics Prototype Enclosure
  (pg_temp.stable_uuid('prod-002'), 'prototype-enclosure-electronics', 'Electronics Prototype Enclosure',
   'Precision-designed enclosure for Arduino, Raspberry Pi, and custom PCBs',
   E'Professional-grade prototype enclosure with customizable mounting points and ventilation. Perfect for electronics projects, IoT devices, and product development.\n\nDEMO PRODUCT - Sample data for development purposes.',
   pg_temp.stable_uuid('cat-002'),
   '{"Material":"ABS (heat resistant)","Mounting":"M3 screw holes","Ventilation":"Integrated air vents","Finish":"Smooth exterior","Tolerances":"±0.1mm"}'::jsonb,
   '["Snap-fit lid design","Pre-drilled mounting holes","Ventilation slots for cooling","Cable management ports","Professional finish"]'::jsonb,
   'published', true, true, '2026-09-28T14:00:00Z', NOW()),

  -- prod-003: Adjustable Phone Stand
  (pg_temp.stable_uuid('prod-003'), 'phone-stand-adjustable', 'Adjustable Phone Stand',
   'Ergonomic phone stand with adjustable viewing angles',
   E'Keep your phone at the perfect viewing angle with this adjustable stand. Features anti-slip base and protective contact surfaces. Ideal for desk, kitchen, or bedside.\n\nDEMO PRODUCT - Sample data for development purposes.',
   pg_temp.stable_uuid('cat-003'),
   '{"Compatibility":"Most smartphones 5-7 inches","Material Options":"PLA, PETG","Angle Adjustment":"45°, 60°, 75°","Weight Capacity":"Up to 300g","Base":"Anti-slip rubber pads"}'::jsonb,
   '["Adjustable viewing angles","Anti-slip base and contact surfaces","Cable pass-through for charging","Compact and portable","Compatible with cases"]'::jsonb,
   'published', true, true, '2026-10-05T09:00:00Z', NOW()),

  -- prod-004: Cable Clip Organizer Set
  (pg_temp.stable_uuid('prod-004'), 'cable-clip-organizer-set', 'Cable Clip Organizer Set',
   'Keep cables tidy with adhesive-backed cable clips',
   E'Set of 10 cable clips that stick to any surface. Perfect for managing charging cables, headphones, and desk wires. Strong adhesive backing with clean removal.\n\nDEMO PRODUCT - Sample data for development purposes.',
   pg_temp.stable_uuid('cat-003'),
   '{"Quantity":"10 clips per set","Cable Diameter":"Up to 6mm","Adhesive":"3M double-sided tape included","Material":"PLA","Finish":"Smooth"}'::jsonb,
   '["Adhesive backing included","Fits most cable types","Clean removal without residue","Compact design","Available in multiple colors"]'::jsonb,
   'published', false, true, '2026-10-08T11:00:00Z', NOW()),

  -- prod-005: Functional Gear Keychain
  (pg_temp.stable_uuid('prod-005'), 'gear-keychain-functional', 'Functional Gear Keychain',
   'Working gear mechanism keychain with smooth rotation',
   E'A fascinating keychain featuring interlocking gears that actually rotate. Great conversation starter and fidget toy. Durable construction for everyday carry.\n\nDEMO PRODUCT - Sample data for development purposes.',
   pg_temp.stable_uuid('cat-001'),
   '{"Mechanism":"Interlocking gears","Ring":"Standard keyring included","Material Options":"PLA, PETG","Finish":"Smooth rotation","Durability":"Everyday carry rated"}'::jsonb,
   '["Working gear mechanism","Smooth rotation","Durable construction","Lightweight","Multiple color options"]'::jsonb,
   'published', false, true, '2026-09-25T16:00:00Z', NOW()),

  -- prod-006: Geometric Planter Pot
  (pg_temp.stable_uuid('prod-006'), 'planter-pot-geometric', 'Geometric Planter Pot',
   'Modern geometric design planter for succulents and small plants',
   E'Add a modern touch to your space with this geometric planter. Features drainage hole and removable saucer. Perfect for succulents, cacti, and small plants.\n\nDEMO PRODUCT - Sample data for development purposes.',
   pg_temp.stable_uuid('cat-003'),
   '{"Drainage":"Bottom drainage hole","Saucer":"Matching saucer included","Material":"PLA (not waterproof - use liner)","Finish":"Matte","Style":"Modern geometric"}'::jsonb,
   '["Unique geometric design","Drainage system","Removable saucer","Lightweight","Multiple colors available"]'::jsonb,
   'published', false, true, '2026-10-10T13:00:00Z', NOW()),

  -- prod-007: Minimal Page Bookmark
  (pg_temp.stable_uuid('prod-007'), 'bookmark-minimal', 'Minimal Page Bookmark',
   'Elegant bookmark with clip design',
   E'Simple yet elegant bookmark that clips onto pages without damaging them. Perfect for readers and students.\n\nDEMO PRODUCT - Sample data for development purposes.',
   pg_temp.stable_uuid('cat-003'),
   '{"Material":"PLA","Thickness":"2mm","Finish":"Smooth"}'::jsonb,
   '["Clip design","Non-damaging","Lightweight","Durable"]'::jsonb,
   'published', false, true, '2026-10-12T10:00:00Z', NOW()),

  -- prod-008: Portable Tablet Stand
  (pg_temp.stable_uuid('prod-008'), 'tablet-stand-portable', 'Portable Tablet Stand',
   'Foldable stand for tablets and e-readers',
   E'Compact and portable stand for tablets. Adjustable angle, folds flat for travel.\n\nDEMO PRODUCT - Sample data for development purposes.',
   pg_temp.stable_uuid('cat-003'),
   '{"Compatibility":"7-12 inch tablets","Angles":"Multiple positions","Portability":"Folds flat"}'::jsonb,
   '["Adjustable angles","Portable design","Anti-slip pads","Sturdy construction"]'::jsonb,
   'published', false, true, '2026-10-15T14:00:00Z', NOW()),

  -- prod-009: Hexagonal Pen Holder
  (pg_temp.stable_uuid('prod-009'), 'pen-holder-hexagonal', 'Hexagonal Pen Holder',
   'Geometric pen and pencil holder for desk',
   E'Modern hexagonal design pen holder. Holds multiple pens, pencils, and markers.\n\nDEMO PRODUCT - Sample data for development purposes.',
   pg_temp.stable_uuid('cat-003'),
   '{"Capacity":"6-12 pens","Base":"Weighted for stability","Finish":"Smooth"}'::jsonb,
   '["Hexagonal design","Multiple compartments","Stable base","Modern aesthetic"]'::jsonb,
   'published', false, true, '2026-10-16T09:00:00Z', NOW()),

  -- prod-010: Mechanical Model - Lever System
  (pg_temp.stable_uuid('prod-010'), 'mechanical-model-educational', 'Mechanical Model - Lever System',
   'Educational model demonstrating lever principles',
   E'Interactive mechanical model for learning about levers and mechanical advantage. Perfect for students and educators.\n\nDEMO PRODUCT - Sample data for development purposes.',
   pg_temp.stable_uuid('cat-004'),
   '{"Type":"First, second, third class levers","Material":"PLA","Assembly":"Snap-fit"}'::jsonb,
   '["Demonstrates 3 lever types","Interactive model","Educational tool","Durable construction"]'::jsonb,
   'published', false, true, '2026-10-17T11:00:00Z', NOW())
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- PRODUCT VARIANTS (21)
-- =============================================
INSERT INTO public.product_variants (id, product_id, sku, size_name, length_mm, width_mm, height_mm, material, color_options, price_paise, production_time_hours, is_default)
VALUES
  -- prod-001 variants
  (pg_temp.stable_uuid('var-001-1'), pg_temp.stable_uuid('prod-001'), 'DESK-ORG-SM-PLA',   'Small',  150, 100, 60,  'PLA',  '["Black","White","Gray","Blue"]'::jsonb,        45000,  4, true),
  (pg_temp.stable_uuid('var-001-2'), pg_temp.stable_uuid('prod-001'), 'DESK-ORG-MD-PLA',   'Medium', 200, 150, 80,  'PLA',  '["Black","White","Gray","Blue"]'::jsonb,        75000,  6, false),
  (pg_temp.stable_uuid('var-001-3'), pg_temp.stable_uuid('prod-001'), 'DESK-ORG-LG-PETG',  'Large',  250, 180, 100, 'PETG', '["Black","White","Transparent"]'::jsonb,       125000, 10, false),
  -- prod-002 variants
  (pg_temp.stable_uuid('var-002-1'), pg_temp.stable_uuid('prod-002'), 'ENC-ELEC-SM-ABS',   'Small (Arduino Uno)',   100, 80,  40, 'ABS', '["Black","White"]'::jsonb,              65000, 5, true),
  (pg_temp.stable_uuid('var-002-2'), pg_temp.stable_uuid('prod-002'), 'ENC-ELEC-MD-ABS',   'Medium (Raspberry Pi)', 120, 100, 50, 'ABS', '["Black","White"]'::jsonb,              85000, 6, false),
  -- prod-003 variants
  (pg_temp.stable_uuid('var-003-1'), pg_temp.stable_uuid('prod-003'), 'PHONE-STD-UNI-PLA', 'Universal', 80, 70, 100, 'PLA',  '["Black","White","Gray","Red","Blue"]'::jsonb,  35000, 3, true),
  (pg_temp.stable_uuid('var-003-2'), pg_temp.stable_uuid('prod-003'), 'PHONE-STD-UNI-PETG','Universal', 80, 70, 100, 'PETG', '["Black","White","Transparent"]'::jsonb,        45000, 3, false),
  -- prod-004 variants
  (pg_temp.stable_uuid('var-004-1'), pg_temp.stable_uuid('prod-004'), 'CABLE-CLIP-10-PLA', 'Standard Set (10 clips)', 25, 15, 8, 'PLA', '["Black","White","Gray"]'::jsonb,       25000, 2, true),
  -- prod-005 variants
  (pg_temp.stable_uuid('var-005-1'), pg_temp.stable_uuid('prod-005'), 'GEAR-KEY-SM-PLA',   'Small',  40, 40, 8,  'PLA',  '["Black","Red","Blue","Green"]'::jsonb,          20000, 1, true),
  (pg_temp.stable_uuid('var-005-2'), pg_temp.stable_uuid('prod-005'), 'GEAR-KEY-MD-PETG',  'Medium', 60, 60, 10, 'PETG', '["Black","Transparent"]'::jsonb,                 30000, 2, false),
  -- prod-006 variants
  (pg_temp.stable_uuid('var-006-1'), pg_temp.stable_uuid('prod-006'), 'PLANT-GEO-SM-PLA',  'Small',  80,  80,  70,  'PLA', '["White","Gray","Terracotta","Mint"]'::jsonb,   55000, 4, true),
  (pg_temp.stable_uuid('var-006-2'), pg_temp.stable_uuid('prod-006'), 'PLANT-GEO-MD-PLA',  'Medium', 120, 120, 100, 'PLA', '["White","Gray","Terracotta"]'::jsonb,           85000, 6, false),
  -- prod-007 variants
  (pg_temp.stable_uuid('var-007-1'), pg_temp.stable_uuid('prod-007'), 'BOOK-MIN-UNI-PLA',  'Universal', 150, 25, 2, 'PLA', '["Black","White","Red"]'::jsonb,                 15000, 1, true),
  -- prod-008 variants
  (pg_temp.stable_uuid('var-008-1'), pg_temp.stable_uuid('prod-008'), 'TAB-STD-UNI-PLA',   'Universal', 200, 150, 20, 'PLA',  '["Black","White"]'::jsonb,                    65000, 4, true),
  (pg_temp.stable_uuid('var-008-2'), pg_temp.stable_uuid('prod-008'), 'TAB-STD-UNI-PETG',  'Universal', 200, 150, 20, 'PETG', '["Black"]'::jsonb,                             75000, 4, false),
  -- prod-009 variants
  (pg_temp.stable_uuid('var-009-1'), pg_temp.stable_uuid('prod-009'), 'PEN-HEX-SM-PLA',    'Small (6 slots)',  80,  80,  100, 'PLA', '["Black","White","Gray","Blue"]'::jsonb,  40000, 3, true),
  (pg_temp.stable_uuid('var-009-2'), pg_temp.stable_uuid('prod-009'), 'PEN-HEX-LG-PLA',    'Large (12 slots)', 120, 120, 120, 'PLA', '["Black","White","Gray"]'::jsonb,         60000, 5, false),
  -- prod-010 variants
  (pg_temp.stable_uuid('var-010-1'), pg_temp.stable_uuid('prod-010'), 'EDU-LEV-UNI-PLA',   'Standard', 250, 100, 80, 'PLA', '["Multi-color"]'::jsonb,                         95000, 8, true)
ON CONFLICT (sku) DO NOTHING;

-- =============================================
-- PRODUCT IMAGES (12)
-- =============================================
INSERT INTO public.product_images (id, product_id, url, alt_text, display_order, is_primary)
VALUES
  -- prod-001 images
  (pg_temp.stable_uuid('img-001-1'), pg_temp.stable_uuid('prod-001'), '/placeholders/product-desk-organizer-1.svg', 'Modular desk organizer with multiple compartments - PLACEHOLDER', 1, true),
  (pg_temp.stable_uuid('img-001-2'), pg_temp.stable_uuid('prod-001'), '/placeholders/product-desk-organizer-2.svg', 'Close-up of interlocking mechanism - PLACEHOLDER', 2, false),
  -- prod-002
  (pg_temp.stable_uuid('img-002-1'), pg_temp.stable_uuid('prod-002'), '/placeholders/product-enclosure-1.svg', 'Electronics enclosure with ventilation slots - PLACEHOLDER', 1, true),
  -- prod-003
  (pg_temp.stable_uuid('img-003-1'), pg_temp.stable_uuid('prod-003'), '/placeholders/product-phone-stand.svg', 'Adjustable phone stand - PLACEHOLDER', 1, true),
  -- prod-004
  (pg_temp.stable_uuid('img-004-1'), pg_temp.stable_uuid('prod-004'), '/placeholders/product-cable-clips.svg', 'Cable clip organizer set - PLACEHOLDER', 1, true),
  -- prod-005
  (pg_temp.stable_uuid('img-005-1'), pg_temp.stable_uuid('prod-005'), '/placeholders/product-gear-keychain.svg', 'Functional gear keychain - PLACEHOLDER', 1, true),
  -- prod-006
  (pg_temp.stable_uuid('img-006-1'), pg_temp.stable_uuid('prod-006'), '/placeholders/product-planter.svg', 'Geometric planter pot - PLACEHOLDER', 1, true),
  -- prod-007
  (pg_temp.stable_uuid('img-007-1'), pg_temp.stable_uuid('prod-007'), '/placeholders/product-bookmark.svg', 'Minimal bookmark - PLACEHOLDER', 1, true),
  -- prod-008
  (pg_temp.stable_uuid('img-008-1'), pg_temp.stable_uuid('prod-008'), '/placeholders/product-tablet-stand.svg', 'Portable tablet stand - PLACEHOLDER', 1, true),
  -- prod-009
  (pg_temp.stable_uuid('img-009-1'), pg_temp.stable_uuid('prod-009'), '/placeholders/product-pen-holder.svg', 'Hexagonal pen holder - PLACEHOLDER', 1, true),
  -- prod-010
  (pg_temp.stable_uuid('img-010-1'), pg_temp.stable_uuid('prod-010'), '/placeholders/product-mechanical-model.svg', 'Lever system mechanical model - PLACEHOLDER', 1, true)
ON CONFLICT (id) DO NOTHING;
