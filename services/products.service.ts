/**
 * Products Service - Dual Mode (JSON / Supabase)
 *
 * Automatically selects between JSON and Supabase implementations
 * based on environment configuration.
 */

import { isSupabaseConfigured } from "@/lib/env";
import type {
  ProductWithCategory,
  ProductFilters,
  Category,
} from "@/lib/data/types";

// Import both implementations
import * as jsonImpl from "./products.service.json";
import * as supabaseImpl from "./products.service.supabase";

// Determine mode at module load
const USE_SUPABASE = isSupabaseConfigured();

if (USE_SUPABASE) {
  console.warn("[Products Service] ✓ Supabase mode enabled");
} else {
  console.warn("[Products Service] ℹ Using JSON fallback mode (Supabase not configured)");
}

/**
 * Get all published products with optional filters
 */
export async function getProducts(
  filters?: ProductFilters
): Promise<ProductWithCategory[]> {
  if (USE_SUPABASE) {
    return supabaseImpl.getProducts(filters);
  } else {
    return jsonImpl.getProducts(filters);
  }
}

/**
 * Get featured products for homepage
 */
export async function getFeaturedProducts(): Promise<ProductWithCategory[]> {
  if (USE_SUPABASE) {
    return supabaseImpl.getFeaturedProducts();
  } else {
    return jsonImpl.getFeaturedProducts();
  }
}

/**
 * Get product by slug
 */
export async function getProductBySlug(
  slug: string
): Promise<ProductWithCategory | null> {
  if (USE_SUPABASE) {
    return supabaseImpl.getProductBySlug(slug);
  } else {
    return jsonImpl.getProductBySlug(slug);
  }
}

/**
 * Get product by ID
 */
export async function getProductById(
  id: string
): Promise<ProductWithCategory | null> {
  if (USE_SUPABASE) {
    return supabaseImpl.getProductById(id);
  } else {
    return jsonImpl.getProductById(id);
  }
}

/**
 * Get all categories
 */
export async function getCategories(): Promise<Category[]> {
  if (USE_SUPABASE) {
    return supabaseImpl.getCategories();
  } else {
    return jsonImpl.getCategories();
  }
}
