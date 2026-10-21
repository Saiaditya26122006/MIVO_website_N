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
  pricePaise: number; // Price in paise (INR × 100) - calculated from weight × material rate
  productionWeightGrams?: number | null; // Production weight for calculating price (optional for backward compatibility)
  productionTimeHours: number | null;
  isActive?: boolean; // Variant availability
  isDefault: boolean;
}

export interface MaterialPricingSettings {
  id: string;
  material: string;
  ratePaisePerGram: number; // Rate in paise per gram
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
