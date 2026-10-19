/**
 * Products Service
 *
 * Data access layer for products with search, filter, and sort capabilities.
 * Currently backed by JSON files, designed for easy migration to Supabase.
 */

import type {
  Product,
  ProductWithCategory,
  ProductFilters,
  Category,
} from "@/lib/data/types";
import productsData from "@/lib/data/products.json";
import categoriesData from "@/lib/data/categories.json";

/**
 * Get all published products with optional filters
 */
export async function getProducts(
  filters?: ProductFilters
): Promise<ProductWithCategory[]> {
  let results = productsData.filter((p) => p.status === "published");

  // Apply search filter
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.shortDescription.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
    );
  }

  // Apply category filter
  if (filters?.categoryId) {
    results = results.filter((p) => p.categoryId === filters.categoryId);
  }

  // Apply sorting
  if (filters?.sortBy) {
    results = [...results].sort((a, b) => {
      switch (filters.sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "price-asc": {
          const priceA = getLowestPrice(a);
          const priceB = getLowestPrice(b);
          return priceA - priceB;
        }
        case "price-desc": {
          const priceA = getLowestPrice(a);
          const priceB = getLowestPrice(b);
          return priceB - priceA;
        }
        default:
          return 0;
      }
    });
  }

  // Attach category information
  return results.map((product) => ({
    ...product,
    category: getCategorySync(product.categoryId),
  }));
}

/**
 * Get featured products for homepage
 */
export async function getFeaturedProducts(): Promise<ProductWithCategory[]> {
  const featured = productsData.filter(
    (p) => p.status === "published" && p.featured
  );

  return featured.map((product) => ({
    ...product,
    category: getCategorySync(product.categoryId),
  }));
}

/**
 * Get product by slug
 */
export async function getProductBySlug(
  slug: string
): Promise<ProductWithCategory | null> {
  const product = productsData.find(
    (p) => p.slug === slug && p.status === "published"
  );

  if (!product) return null;

  return {
    ...product,
    category: getCategorySync(product.categoryId),
  };
}

/**
 * Get product by ID
 */
export async function getProductById(
  id: string
): Promise<ProductWithCategory | null> {
  const product = productsData.find(
    (p) => p.id === id && p.status === "published"
  );

  if (!product) return null;

  return {
    ...product,
    category: getCategorySync(product.categoryId),
  };
}

// Helper functions

function getLowestPrice(product: Product): number {
  if (product.variants.length === 0) return 0;
  return Math.min(...product.variants.map((v) => v.pricePaise));
}

function getCategorySync(categoryId: string): Category {
  const category = categoriesData.find((c) => c.id === categoryId);
  if (!category) {
    // Fallback category if not found
    return {
      id: "unknown",
      name: "Uncategorized",
      slug: "uncategorized",
      description: "",
      imageUrl: "",
      sortOrder: 999,
    };
  }
  return category;
}

// ========================================
// FUTURE SUPABASE MIGRATION
// ========================================
// When migrating to Supabase, replace the above with:
//
// import { createClient } from "@/lib/supabase/server";
//
// export async function getProducts(filters?: ProductFilters): Promise<ProductWithCategory[]> {
//   const supabase = await createClient();
//   let query = supabase
//     .from('products')
//     .select('*, category:categories(*), images(*), variants(*)')
//     .eq('status', 'published');
//
//   if (filters?.search) {
//     query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
//   }
//
//   if (filters?.categoryId) {
//     query = query.eq('category_id', filters.categoryId);
//   }
//
//   if (filters?.sortBy) {
//     const [field, direction] = filters.sortBy.split('-');
//     if (field === 'name') {
//       query = query.order('name', { ascending: direction === 'asc' });
//     }
//     // Price sorting would require joining variants table
//   }
//
//   const { data, error } = await query;
//   if (error) throw error;
//   return data || [];
// }
