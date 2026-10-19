/**
 * MIVO Product Data Types
 *
 * These types define the product catalogue structure.
 * Currently backed by JSON files, designed for future Supabase migration.
 */

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
}

export interface ProductImage {
  id: string;
  url: string;
  altText: string;
  displayOrder: number;
  isPrimary: boolean;
}

export interface ProductVariant {
  id: string;
  sku: string;
  sizeName: string;
  dimensions: {
    lengthMm: number;
    widthMm: number;
    heightMm: number;
  };
  material: string;
  colorOptions: string[];
  pricePaise: number; // Fixed price in paise (INR × 100)
  productionTimeHours: number | null;
  isDefault: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  images: ProductImage[];
  variants: ProductVariant[];
  specifications: Record<string, string | undefined>;
  features: string[];
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  madeToOrder: true; // Always true for MIVO
  createdAt: string;
}

// Search and filter types
export interface ProductFilters {
  search?: string;
  categoryId?: string;
  sortBy?: 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc';
}

export interface ProductWithCategory extends Product {
  category: Category;
}
