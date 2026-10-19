/**
 * Category Service
 *
 * Data access layer for product categories.
 * Currently backed by JSON files, designed for easy migration to Supabase.
 */

import type { Category } from "@/lib/data/types";
import categoriesData from "@/lib/data/categories.json";

/**
 * Get all categories sorted by sort order
 */
export async function getAllCategories(): Promise<Category[]> {
  // Currently synchronous JSON import, but async signature
  // allows future Supabase migration without changing callers
  return [...categoriesData].sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Get category by slug
 */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const category = categoriesData.find((cat) => cat.slug === slug);
  return category || null;
}

/**
 * Get category by ID
 */
export async function getCategoryById(id: string): Promise<Category | null> {
  const category = categoriesData.find((cat) => cat.id === id);
  return category || null;
}

// ========================================
// FUTURE SUPABASE MIGRATION
// ========================================
// When migrating to Supabase, replace the above with:
//
// import { createClient } from "@/lib/supabase/server";
//
// export async function getAllCategories(): Promise<Category[]> {
//   const supabase = await createClient();
//   const { data, error } = await supabase
//     .from('categories')
//     .select('*')
//     .order('sort_order', { ascending: true });
//
//   if (error) throw error;
//   return data || [];
// }
//
// export async function getCategoryBySlug(slug: string): Promise<Category | null> {
//   const supabase = await createClient();
//   const { data, error } = await supabase
//     .from('categories')
//     .select('*')
//     .eq('slug', slug)
//     .single();
//
//   if (error) return null;
//   return data;
// }
