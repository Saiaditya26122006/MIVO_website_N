/**
 * Products Service - JSON Implementation
 *
 * Local JSON-based data access for development without Supabase.
 * This file contains the original JSON-backed implementation.
 */

import type {
  Product,
  ProductWithCategory,
  ProductFilters,
  Category,
} from "@/lib/data/types";
import productsDataRaw from "@/lib/data/products.json";
import categoriesDataRaw from "@/lib/data/categories.json";

// Type assertions for JSON imports
const productsData = productsDataRaw as Product[];
const categoriesData = categoriesDataRaw as Category[];

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
  return results.map((product): ProductWithCategory => ({
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

  return featured.map((product): ProductWithCategory => ({
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

  const result: ProductWithCategory = {
    ...product,
    category: getCategorySync(product.categoryId),
  };

  return result;
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

  const result: ProductWithCategory = {
    ...product,
    category: getCategorySync(product.categoryId),
  };

  return result;
}

/**
 * Get all categories
 */
export async function getCategories(): Promise<Category[]> {
  return categoriesData;
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
