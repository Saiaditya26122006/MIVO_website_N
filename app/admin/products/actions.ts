"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/admin";
import { revalidatePath } from "next/cache";

export interface ProductFormData {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  specifications?: Record<string, string>;
  features?: string[];
  status: "draft" | "published" | "archived";
  featured: boolean;
}

export interface ProductVariantFormData {
  id?: string;
  sku: string;
  sizeName: string;
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  material: string;
  colorOptions: string[];
  pricePaise: number;
  productionTimeHours: number | null;
  isDefault: boolean;
}

export interface ProductImageFormData {
  id?: string;
  url: string;
  altText: string;
  displayOrder: number;
  isPrimary: boolean;
}

export interface CreateProductResult {
  success: boolean;
  productId?: string;
  error?: string;
}

export interface UpdateProductResult {
  success: boolean;
  error?: string;
}

export interface DeleteProductResult {
  success: boolean;
  error?: string;
}

/**
 * Create a new product with variants and images
 */
export async function createProduct(
  product: ProductFormData,
  variants: ProductVariantFormData[],
  images: ProductImageFormData[]
): Promise<CreateProductResult> {
  try {
    await requireAdmin();

    const supabase = await createClient();

    // Validate product data
    if (!product.name?.trim()) {
      return { success: false, error: "Product name is required" };
    }
    if (!product.slug?.trim()) {
      return { success: false, error: "Product slug is required" };
    }
    if (!product.categoryId) {
      return { success: false, error: "Category is required" };
    }
    if (variants.length === 0) {
      return { success: false, error: "At least one variant is required" };
    }

    // Check slug uniqueness
    const { data: existingSlug } = await supabase
      .from("products")
      .select("id")
      .eq("slug", product.slug)
      .single();

    if (existingSlug) {
      return { success: false, error: `Slug "${product.slug}" is already in use` };
    }

    // Check SKU uniqueness
    const skus = variants.map((v) => v.sku);
    if (skus.length !== new Set(skus).size) {
      return { success: false, error: "Duplicate SKUs found in variants" };
    }

    const { data: existingSku } = await supabase
      .from("product_variants")
      .select("sku")
      .in("sku", skus)
      .limit(1);

    if (existingSku && existingSku.length > 0) {
      return { success: false, error: `SKU "${existingSku[0].sku}" is already in use` };
    }

    // Ensure exactly one default variant
    const defaultVariants = variants.filter((v) => v.isDefault);
    if (defaultVariants.length !== 1) {
      return { success: false, error: "Exactly one variant must be marked as default" };
    }

    // Ensure at most one primary image
    const primaryImages = images.filter((img) => img.isPrimary);
    if (primaryImages.length > 1) {
      return { success: false, error: "Only one image can be marked as primary" };
    }

    // Create product
    const { data: newProduct, error: productError } = await supabase
      .from("products")
      .insert({
        name: product.name,
        slug: product.slug,
        short_description: product.shortDescription,
        description: product.description,
        category_id: product.categoryId,
        specifications: product.specifications || {},
        features: product.features || [],
        status: product.status,
        featured: product.featured,
        made_to_order: true,
      })
      .select("id")
      .single();

    if (productError || !newProduct) {
      console.error("[Admin] Failed to create product:", productError);
      return { success: false, error: `Database error: ${productError?.message || "Unknown"}` };
    }

    // Create variants
    const variantInserts = variants.map((v) => ({
      product_id: newProduct.id,
      sku: v.sku,
      size_name: v.sizeName,
      length_mm: v.lengthMm,
      width_mm: v.widthMm,
      height_mm: v.heightMm,
      material: v.material,
      color_options: v.colorOptions,
      price_paise: v.pricePaise,
      production_time_hours: v.productionTimeHours,
      is_default: v.isDefault,
    }));

    const { error: variantsError } = await supabase
      .from("product_variants")
      .insert(variantInserts);

    if (variantsError) {
      console.error("[Admin] Failed to create variants:", variantsError);
      // Rollback: delete product
      await supabase.from("products").delete().eq("id", newProduct.id);
      return { success: false, error: `Failed to create variants: ${variantsError.message}` };
    }

    // Create images if provided
    if (images.length > 0) {
      const imageInserts = images.map((img) => ({
        product_id: newProduct.id,
        url: img.url,
        alt_text: img.altText,
        display_order: img.displayOrder,
        is_primary: img.isPrimary,
      }));

      const { error: imagesError } = await supabase
        .from("product_images")
        .insert(imageInserts);

      if (imagesError) {
        console.error("[Admin] Failed to create images:", imagesError);
        // Continue anyway - images can be added later
      }
    }

    revalidatePath("/admin/products");
    revalidatePath("/explore");
    revalidatePath(`/product/${product.slug}`);

    return { success: true, productId: newProduct.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Admin] Create product failed:", message);
    return {
      success: false,
      error: message.includes("Admin") ? "Unauthorized" : "Failed to create product",
    };
  }
}

/**
 * Update an existing product
 */
export async function updateProduct(
  productId: string,
  product: ProductFormData,
  variants: ProductVariantFormData[],
  images: ProductImageFormData[]
): Promise<UpdateProductResult> {
  try {
    await requireAdmin();

    const supabase = await createClient();

    // Validate
    if (!product.name?.trim()) {
      return { success: false, error: "Product name is required" };
    }
    if (variants.length === 0) {
      return { success: false, error: "At least one variant is required" };
    }

    // Check slug uniqueness (excluding current product)
    const { data: existingSlug } = await supabase
      .from("products")
      .select("id")
      .eq("slug", product.slug)
      .neq("id", productId)
      .single();

    if (existingSlug) {
      return { success: false, error: `Slug "${product.slug}" is already in use` };
    }

    // Check SKU uniqueness
    const skus = variants.map((v) => v.sku);
    if (skus.length !== new Set(skus).size) {
      return { success: false, error: "Duplicate SKUs found in variants" };
    }

    const { data: existingSku } = await supabase
      .from("product_variants")
      .select("sku, product_id")
      .in("sku", skus)
      .neq("product_id", productId)
      .limit(1);

    if (existingSku && existingSku.length > 0) {
      return { success: false, error: `SKU "${existingSku[0].sku}" is already in use` };
    }

    // Validate default variant
    const defaultVariants = variants.filter((v) => v.isDefault);
    if (defaultVariants.length !== 1) {
      return { success: false, error: "Exactly one variant must be marked as default" };
    }

    // Validate primary image
    const primaryImages = images.filter((img) => img.isPrimary);
    if (primaryImages.length > 1) {
      return { success: false, error: "Only one image can be marked as primary" };
    }

    // Update product
    const { error: productError } = await supabase
      .from("products")
      .update({
        name: product.name,
        slug: product.slug,
        short_description: product.shortDescription,
        description: product.description,
        category_id: product.categoryId,
        specifications: product.specifications || {},
        features: product.features || [],
        status: product.status,
        featured: product.featured,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId);

    if (productError) {
      console.error("[Admin] Failed to update product:", productError);
      return { success: false, error: `Database error: ${productError.message}` };
    }

    // Get existing variants
    const { data: existingVariants } = await supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", productId);

    const existingVariantIds = new Set<string>((existingVariants || []).map((v: { id: string }) => v.id));
    const submittedVariantIds = new Set<string>(variants.filter((v) => v.id).map((v) => v.id as string));

    // Delete removed variants
    const variantsToDelete: string[] = [];
    existingVariantIds.forEach((id: string) => {
      if (!submittedVariantIds.has(id)) {
        variantsToDelete.push(id);
      }
    });
    if (variantsToDelete.length > 0) {
      await supabase.from("product_variants").delete().in("id", variantsToDelete);
    }

    // Update or insert variants
    for (const variant of variants) {
      if (variant.id && existingVariantIds.has(variant.id)) {
        // Update existing
        await supabase
          .from("product_variants")
          .update({
            sku: variant.sku,
            size_name: variant.sizeName,
            length_mm: variant.lengthMm,
            width_mm: variant.widthMm,
            height_mm: variant.heightMm,
            material: variant.material,
            color_options: variant.colorOptions,
            price_paise: variant.pricePaise,
            production_time_hours: variant.productionTimeHours,
            is_default: variant.isDefault,
          })
          .eq("id", variant.id);
      } else {
        // Insert new
        await supabase.from("product_variants").insert({
          product_id: productId,
          sku: variant.sku,
          size_name: variant.sizeName,
          length_mm: variant.lengthMm,
          width_mm: variant.widthMm,
          height_mm: variant.heightMm,
          material: variant.material,
          color_options: variant.colorOptions,
          price_paise: variant.pricePaise,
          production_time_hours: variant.productionTimeHours,
          is_default: variant.isDefault,
        });
      }
    }

    // Update images similarly
    const { data: existingImages } = await supabase
      .from("product_images")
      .select("id")
      .eq("product_id", productId);

    const existingImageIds = new Set<string>((existingImages || []).map((img: { id: string }) => img.id));
    const submittedImageIds = new Set<string>(images.filter((img) => img.id).map((img) => img.id as string));

    const imagesToDelete: string[] = [];
    existingImageIds.forEach((id: string) => {
      if (!submittedImageIds.has(id)) {
        imagesToDelete.push(id);
      }
    });
    if (imagesToDelete.length > 0) {
      await supabase.from("product_images").delete().in("id", imagesToDelete);
    }

    for (const image of images) {
      if (image.id && existingImageIds.has(image.id)) {
        await supabase
          .from("product_images")
          .update({
            url: image.url,
            alt_text: image.altText,
            display_order: image.displayOrder,
            is_primary: image.isPrimary,
          })
          .eq("id", image.id);
      } else {
        await supabase.from("product_images").insert({
          product_id: productId,
          url: image.url,
          alt_text: image.altText,
          display_order: image.displayOrder,
          is_primary: image.isPrimary,
        });
      }
    }

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/explore");
    revalidatePath(`/product/${product.slug}`);

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Admin] Update product failed:", message);
    return {
      success: false,
      error: message.includes("Admin") ? "Unauthorized" : "Failed to update product",
    };
  }
}

/**
 * Delete a product and all its variants and images
 */
export async function deleteProduct(productId: string): Promise<DeleteProductResult> {
  try {
    await requireAdmin();

    const supabase = await createClient();

    // Delete images first
    await supabase.from("product_images").delete().eq("product_id", productId);

    // Delete variants
    await supabase.from("product_variants").delete().eq("product_id", productId);

    // Delete product
    const { error } = await supabase.from("products").delete().eq("id", productId);

    if (error) {
      console.error("[Admin] Failed to delete product:", error);
      return { success: false, error: `Database error: ${error.message}` };
    }

    revalidatePath("/admin/products");
    revalidatePath("/explore");

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Admin] Delete product failed:", message);
    return {
      success: false,
      error: message.includes("Admin") ? "Unauthorized" : "Failed to delete product",
    };
  }
}
