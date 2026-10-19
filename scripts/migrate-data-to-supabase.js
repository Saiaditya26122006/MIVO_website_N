/**
 * Data Migration Script - JSON to Supabase
 *
 * Migrates product data from lib/data/products.json to Supabase PostgreSQL.
 *
 * USAGE:
 *   node scripts/migrate-data-to-supabase.js
 *
 * REQUIREMENTS:
 *   - Supabase project created
 *   - Migrations 001, 002, 003 applied
 *   - .env.local configured with:
 *     - NEXT_PUBLIC_SUPABASE_URL
 *     - SUPABASE_SERVICE_ROLE_KEY (for admin operations)
 *
 * SECURITY:
 *   - Uses service_role key for write access (bypasses RLS)
 *   - Never commit service_role key to Git
 *   - Only run this script in secure environments
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Validate environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nAdd these to .env.local and try again.');
  process.exit(1);
}

// Create admin client (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Load products data
const productsPath = join(__dirname, '../lib/data/products.json');
const data = JSON.parse(readFileSync(productsPath, 'utf-8'));

/**
 * Map TypeScript dimensions object to separate database columns
 */
function mapDimensionsToDB(dimensions) {
  return {
    length_mm: dimensions.lengthMm,
    width_mm: dimensions.widthMm,
    height_mm: dimensions.heightMm,
  };
}

/**
 * Clear existing data (for clean re-import during development)
 */
async function clearData() {
  console.log('🗑️  Clearing existing data...');

  // Delete in reverse dependency order
  await supabase.from('product_variants').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('product_images').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('✓ Data cleared');
}

/**
 * Import categories
 */
async function importCategories() {
  console.log('\n📁 Importing categories...');

  const categories = data.categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description || '',
    image_url: cat.imageUrl || '',
    sort_order: cat.sortOrder || 0,
  }));

  const { data: result, error } = await supabase
    .from('categories')
    .insert(categories)
    .select();

  if (error) {
    console.error('❌ Category import failed:', error.message);
    throw error;
  }

  console.log(`✓ Imported ${result.length} categories`);
  return result;
}

/**
 * Import products (without relations)
 */
async function importProducts() {
  console.log('\n📦 Importing products...');

  const products = data.products.map(prod => ({
    id: prod.id,
    slug: prod.slug,
    name: prod.name,
    short_description: prod.shortDescription,
    description: prod.description,
    category_id: prod.categoryId,
    specifications: prod.specifications || {},
    features: prod.features || [],
    status: prod.status || 'published',
    featured: prod.featured || false,
  }));

  const { data: result, error } = await supabase
    .from('products')
    .insert(products)
    .select();

  if (error) {
    console.error('❌ Product import failed:', error.message);
    throw error;
  }

  console.log(`✓ Imported ${result.length} products`);
  return result;
}

/**
 * Import product images
 */
async function importImages() {
  console.log('\n🖼️  Importing product images...');

  let allImages = [];

  for (const product of data.products) {
    if (!product.images || product.images.length === 0) continue;

    const images = product.images.map(img => ({
      id: img.id,
      product_id: product.id,
      url: img.url,
      alt_text: img.altText || '',
      display_order: img.displayOrder || 0,
      is_primary: img.isPrimary || false,
    }));

    allImages.push(...images);
  }

  if (allImages.length === 0) {
    console.log('⚠️  No images to import');
    return [];
  }

  const { data: result, error } = await supabase
    .from('product_images')
    .insert(allImages)
    .select();

  if (error) {
    console.error('❌ Image import failed:', error.message);
    throw error;
  }

  console.log(`✓ Imported ${result.length} images`);
  return result;
}

/**
 * Import product variants
 */
async function importVariants() {
  console.log('\n📐 Importing product variants...');

  let allVariants = [];

  for (const product of data.products) {
    if (!product.variants || product.variants.length === 0) continue;

    const variants = product.variants.map(variant => ({
      id: variant.id,
      product_id: product.id,
      sku: variant.sku,
      size_name: variant.sizeName,
      ...mapDimensionsToDB(variant.dimensions),
      material: variant.material,
      color_options: variant.colorOptions || [],
      price_paise: variant.pricePaise,
      production_time_hours: variant.productionTimeHours || null,
      is_default: variant.isDefault || false,
    }));

    allVariants.push(...variants);
  }

  if (allVariants.length === 0) {
    console.log('⚠️  No variants to import');
    return [];
  }

  const { data: result, error } = await supabase
    .from('product_variants')
    .insert(allVariants)
    .select();

  if (error) {
    console.error('❌ Variant import failed:', error.message);
    throw error;
  }

  console.log(`✓ Imported ${result.length} variants`);
  return result;
}

/**
 * Verify import integrity
 */
async function verifyImport() {
  console.log('\n🔍 Verifying import...');

  // Check counts
  const { count: catCount } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true });

  const { count: prodCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });

  const { count: imgCount } = await supabase
    .from('product_images')
    .select('*', { count: 'exact', head: true });

  const { count: varCount } = await supabase
    .from('product_variants')
    .select('*', { count: 'exact', head: true });

  console.log('📊 Database counts:');
  console.log(`   Categories: ${catCount}`);
  console.log(`   Products: ${prodCount}`);
  console.log(`   Images: ${imgCount}`);
  console.log(`   Variants: ${varCount}`);

  // Verify expected counts
  const expectedCats = data.categories.length;
  const expectedProds = data.products.length;
  const expectedImgs = data.products.reduce((sum, p) => sum + (p.images?.length || 0), 0);
  const expectedVars = data.products.reduce((sum, p) => sum + (p.variants?.length || 0), 0);

  const success =
    catCount === expectedCats &&
    prodCount === expectedProds &&
    imgCount === expectedImgs &&
    varCount === expectedVars;

  if (success) {
    console.log('✓ All counts match expected values');
  } else {
    console.warn('⚠️  Count mismatch detected:');
    if (catCount !== expectedCats) console.warn(`   Categories: expected ${expectedCats}, got ${catCount}`);
    if (prodCount !== expectedProds) console.warn(`   Products: expected ${expectedProds}, got ${prodCount}`);
    if (imgCount !== expectedImgs) console.warn(`   Images: expected ${expectedImgs}, got ${imgCount}`);
    if (varCount !== expectedVars) console.warn(`   Variants: expected ${expectedVars}, got ${varCount}`);
  }

  return success;
}

/**
 * Main migration flow
 */
async function migrate() {
  console.log('🚀 Starting data migration to Supabase...\n');
  console.log(`📍 Project: ${supabaseUrl}`);
  console.log(`📄 Source: ${productsPath}`);

  try {
    // Optional: Clear existing data (comment out for incremental imports)
    await clearData();

    // Import in dependency order
    await importCategories();
    await importProducts();
    await importImages();
    await importVariants();

    // Verify
    const success = await verifyImport();

    console.log('\n' + '='.repeat(50));
    if (success) {
      console.log('✅ Migration completed successfully!');
    } else {
      console.log('⚠️  Migration completed with warnings');
    }
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nRollback by clearing data and trying again.');
    process.exit(1);
  }
}

// Run migration
migrate();
