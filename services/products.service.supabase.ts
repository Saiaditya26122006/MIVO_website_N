/**
 * Products Service - Supabase Implementation
 *
 * Data access layer backed by Supabase PostgreSQL database.
 * Maps between database schema (snake_case columns) and TypeScript types (camelCase).
 */

import { createClient } from "@/lib/supabase/client";
import type {
  Product,
  ProductWithCategory,
  ProductFilters,
  Category,
  ProductVariant,
  ProductImage,
} from "@/lib/data/types";

// ========================================
// MAPPING FUNCTIONS
// ========================================

/**
 * Map database variant row to TypeScript ProductVariant
 * CRITICAL: Database has separate length_mm, width_mm, height_mm columns
 * TypeScript expects nested dimensions object
 */
function mapVariantFromDB(dbRow: Record<string, unknown>): ProductVariant {
  return {
    id: dbRow.id as string,
    sku: dbRow.sku as string,
    sizeName: dbRow.size_name as string,
    dimensions: {
      lengthMm: Number(dbRow.length_mm),
      widthMm: Number(dbRow.width_mm),
      heightMm: Number(dbRow.height_mm),
    },
    material: dbRow.material as string,
    colorOptions: (dbRow.color_options as string[]) || [],
    pricePaise: Number(dbRow.price_paise),
    productionWeightGrams: dbRow.production_weight_grams !== null && dbRow.production_weight_grams !== undefined
      ? Number(dbRow.production_weight_grams)
      : null,
    productionTimeHours: (dbRow.production_time_hours as number | null) || null,
    isActive: (dbRow.is_active as boolean) !== false,
    isDefault: (dbRow.is_default as boolean) || false,
  };
}

/**
 * Map database image row to TypeScript ProductImage
 */
function mapImageFromDB(dbRow: Record<string, unknown>): ProductImage {
  return {
    id: dbRow.id as string,
    url: dbRow.url as string,
    altText: (dbRow.alt_text as string) || "",
    displayOrder: (dbRow.display_order as number) || 0,
    isPrimary: (dbRow.is_primary as boolean) || false,
  };
}

/**
 * Map database product row to TypeScript Product
 */
function mapProductFromDB(dbRow: Record<string, unknown>): Product {
  return {
    id: dbRow.id as string,
    slug: dbRow.slug as string,
    name: dbRow.name as string,
    shortDescription: dbRow.short_description as string,
    description: dbRow.description as string,
    categoryId: dbRow.category_id as string,
    images: ((dbRow.product_images as Record<string, unknown>[]) || []).map(mapImageFromDB),
    variants: ((dbRow.product_variants as Record<string, unknown>[]) || []).map(mapVariantFromDB),
    specifications: (dbRow.specifications as Record<string, string | undefined>) || {},
    features: (dbRow.features as string[]) || [],
    status: dbRow.status as 'draft' | 'published' | 'archived',
    featured: (dbRow.featured as boolean) || false,
    madeToOrder: true, // Always true for MIVO
    createdAt: dbRow.created_at as string,
  };
}

/**
 * Map database category row to TypeScript Category
 */
function mapCategoryFromDB(dbRow: Record<string, unknown>): Category {
  return {
    id: dbRow.id as string,
    name: dbRow.name as string,
    slug: dbRow.slug as string,
    description: (dbRow.description as string) || "",
    imageUrl: (dbRow.image_url as string) || "",
    sortOrder: (dbRow.sort_order as number) || 0,
  };
}

// ========================================
// PUBLIC API
// ========================================

/**
 * Get all published products with optional filters
 */
export async function getProducts(
  filters?: ProductFilters
): Promise<ProductWithCategory[]> {
  const supabase = createClient();

  // Build query with related data
  let query = supabase
    .from("products")
    .select(
      `
      *,
      category:categories(*),
      product_images(*),
      product_variants(*)
    `
    )
    .eq("status", "published");

  // Apply search filter
  if (filters?.search) {
    const searchPattern = `%${filters.search}%`;
    query = query.or(
      `name.ilike.${searchPattern},short_description.ilike.${searchPattern},description.ilike.${searchPattern}`
    );
  }

  // Apply category filter
  if (filters?.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }

  // Apply sorting
  if (filters?.sortBy) {
    switch (filters.sortBy) {
      case "name-asc":
        query = query.order("name", { ascending: true });
        break;
      case "name-desc":
        query = query.order("name", { ascending: false });
        break;
      case "price-asc":
      case "price-desc":
        // Price sorting requires subquery - handle client-side for now
        // TODO: Optimize with database view or materialized column
        break;
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("[Supabase Products Service] Error fetching products:", error);
    throw error;
  }

  if (!data) return [];

  // Map to TypeScript types
  let products: ProductWithCategory[] = data.map((row: Record<string, unknown>) => {
    const product = mapProductFromDB(row);
    const category = mapCategoryFromDB(row.category as Record<string, unknown>);

    return {
      ...product,
      category,
    };
  });

  // Client-side price sorting (if needed)
  if (filters?.sortBy === "price-asc" || filters?.sortBy === "price-desc") {
    products = products.sort((a, b) => {
      const priceA = Math.min(...a.variants.map((v) => v.pricePaise));
      const priceB = Math.min(...b.variants.map((v) => v.pricePaise));

      return filters.sortBy === "price-asc"
        ? priceA - priceB
        : priceB - priceA;
    });
  }

  return products;
}

/**
 * Get featured products for homepage
 */
export async function getFeaturedProducts(): Promise<ProductWithCategory[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      category:categories(*),
      product_images(*),
      product_variants(*)
    `
    )
    .eq("status", "published")
    .eq("featured", true);

  if (error) {
    console.error("[Supabase Products Service] Error fetching featured products:", error);
    throw error;
  }

  if (!data) return [];

  return data.map((row: Record<string, unknown>) => {
    const product = mapProductFromDB(row);
    const category = mapCategoryFromDB(row.category as Record<string, unknown>);

    return {
      ...product,
      category,
    };
  });
}

/**
 * Get product by slug
 */
export async function getProductBySlug(
  slug: string
): Promise<ProductWithCategory | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      category:categories(*),
      product_images(*),
      product_variants(*)
    `
    )
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found
      return null;
    }
    console.error("[Supabase Products Service] Error fetching product:", error);
    throw error;
  }

  if (!data) return null;

  const product = mapProductFromDB(data);
  const category = mapCategoryFromDB(data.category);

  return {
    ...product,
    category,
  };
}

/**
 * Get product by ID
 */
export async function getProductById(
  id: string
): Promise<ProductWithCategory | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("products")
    .select(
      `
      *,
      category:categories(*),
      product_images(*),
      product_variants(*)
    `
    )
    .eq("id", id)
    .eq("status", "published")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("[Supabase Products Service] Error fetching product by ID:", error);
    throw error;
  }

  if (!data) return null;

  const product = mapProductFromDB(data);
  const category = mapCategoryFromDB(data.category);

  return {
    ...product,
    category,
  };
}

/**
 * Get all categories
 */
export async function getCategories(): Promise<Category[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[Supabase Products Service] Error fetching categories:", error);
    throw error;
  }

  if (!data) return [];

  return data.map(mapCategoryFromDB);
}
