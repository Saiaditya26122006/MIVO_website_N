"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { updateProduct, uploadProductImage, deleteProductImage } from "../../actions";
import type { ProductFormData, ProductVariantFormData, ProductImageFormData } from "../../actions";
import { VariantEditor } from "@/components/admin/VariantEditor";

interface Category {
  id: string;
  name: string;
}

interface LoadedProduct {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  specifications: Record<string, string>;
  features: string[];
  status: "draft" | "published" | "archived";
  featured: boolean;
}

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.productId as string;

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [product, setProduct] = useState<ProductFormData>({
    name: "",
    slug: "",
    shortDescription: "",
    description: "",
    categoryId: "",
    specifications: {},
    features: [],
    status: "draft",
    featured: false,
  });

  const [variants, setVariants] = useState<ProductVariantFormData[]>([]);
  const [images, setImages] = useState<ProductImageFormData[]>([]);
  const [materialRates, setMaterialRates] = useState<Record<string, number>>({
    PLA: 500,
    PETG: 600,
    TPU: 800,
  });

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login?redirect=/admin/products");
        return;
      }

      const { data: profile } = await supabase
        .from("customer_profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!profile?.is_admin) {
        router.push("/");
        return;
      }

      setIsAdmin(true);

      // Load categories
      const { data: cats } = await supabase
        .from("categories")
        .select("id, name")
        .order("sort_order");

      setCategories(cats || []);

      // Load material rates
      const { data: rates } = await supabase
        .from("material_pricing_settings")
        .select("material, rate_paise_per_gram")
        .eq("is_active", true);

      if (rates && rates.length > 0) {
        const ratesMap: Record<string, number> = {};
        rates.forEach((r: { material: string; rate_paise_per_gram: number }) => {
          ratesMap[r.material] = r.rate_paise_per_gram;
        });
        setMaterialRates(ratesMap);
      }

      // Load product
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select(`
          id, name, slug, short_description, description, category_id,
          specifications, features, status, featured
        `)
        .eq("id", productId)
        .single();

      if (productError || !productData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProduct({
        name: productData.name,
        slug: productData.slug,
        shortDescription: productData.short_description || "",
        description: productData.description || "",
        categoryId: productData.category_id,
        specifications: productData.specifications || {},
        features: productData.features || [],
        status: productData.status,
        featured: productData.featured,
      });

      // Load variants
      const { data: variantsData } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", productId)
        .order("is_default", { ascending: false });

      if (variantsData) {
        setVariants(
          variantsData.map((v: Record<string, unknown>) => ({
            id: v.id as string,
            sku: v.sku as string,
            sizeName: v.size_name as string,
            lengthMm: v.length_mm as number,
            widthMm: v.width_mm as number,
            heightMm: v.height_mm as number,
            material: v.material as string,
            colorOptions: (v.color_options as string[]) || [],
            pricePaise: v.price_paise as number,
            productionWeightGrams: v.production_weight_grams as number | null,
            productionTimeHours: v.production_time_hours as number | null,
            isActive: (v.is_active as boolean) !== false,
            isDefault: v.is_default as boolean,
          }))
        );
      }

      // Load images
      const { data: imagesData } = await supabase
        .from("product_images")
        .select("*")
        .eq("product_id", productId)
        .order("display_order");

      if (imagesData) {
        setImages(
          imagesData.map((img: Record<string, unknown>) => ({
            id: img.id as string,
            url: img.url as string,
            altText: (img.alt_text as string) || "",
            displayOrder: img.display_order as number,
            isPrimary: img.is_primary as boolean,
          }))
        );
      }

      setLoading(false);
    }

    init();
  }, [productId, router]);

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
      return;
    }

    setUploadingImage(true);
    setError(null);

    // Create FormData to pass file to server action
    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadProductImage(productId, formData);

    if (!result.success) {
      setError(result.error || "Failed to upload image");
      setUploadingImage(false);
      return;
    }

    // Add to images list
    setImages([
      ...images,
      {
        url: result.url!,
        altText: product.name,
        displayOrder: images.length,
        isPrimary: images.length === 0,
      },
    ]);

    setUploadingImage(false);

    // Reset file input
    e.target.value = "";
  }

  async function handleDeleteImage(index: number) {
    const image = images[index];

    // Only call server action if the image has been saved to database
    if (image.id) {
      setError(null);
      const result = await deleteProductImage(image.id, image.url);
      if (!result.success) {
        setError(result.error || "Failed to delete image");
        return;
      }
    }

    // Remove from local state
    const newImages = images.filter((_, i) => i !== index);

    // If deleted image was primary, make first remaining image primary
    if (image.isPrimary && newImages.length > 0) {
      newImages[0].isPrimary = true;
    }

    setImages(newImages);
  }

  async function handleReplaceImage(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
      return;
    }

    setUploadingImage(true);
    setError(null);

    // Delete old image if it exists in database
    const oldImage = images[index];
    if (oldImage.id) {
      await deleteProductImage(oldImage.id, oldImage.url);
    }

    // Upload new image
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadProductImage(productId, formData);

    if (!result.success) {
      setError(result.error || "Failed to upload image");
      setUploadingImage(false);
      return;
    }

    // Replace in images list
    const newImages = [...images];
    newImages[index] = {
      url: result.url!,
      altText: product.name,
      displayOrder: index,
      isPrimary: oldImage.isPrimary,
    };
    setImages(newImages);

    setUploadingImage(false);
    e.target.value = "";
  }

  async function handleSubmit() {
    setError(null);
    setSaving(true);

    const result = await updateProduct(productId, product, variants, images);

    if (!result.success) {
      setError(result.error || "Failed to update product");
      setSaving(false);
      return;
    }

    router.push(`/admin/products`);
  }

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="flex-1 pt-20 min-h-screen flex items-center justify-center">
          <p className="text-ink/60">Loading product...</p>
        </main>
        <Footer />
      </>
    );
  }

  if (notFound || !isAdmin) {
    return (
      <>
        <Navigation />
        <main className="flex-1 pt-20 min-h-screen">
          <section className="py-16">
            <div className="max-w-4xl mx-auto px-6 text-center">
              <h1 className="font-handwritten text-4xl md:text-5xl font-bold text-ink mb-4">
                Product Not Found
              </h1>
              <p className="text-ink/70 mb-8">The product you're looking for doesn't exist.</p>
              <Link href="/admin/products">
                <Button variant="accent" size="lg" className="rounded-full">
                  Back to Products
                </Button>
              </Link>
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navigation />
      <main className="flex-1 pt-20 min-h-screen">
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-6">
            <Link
              href="/admin/products"
              className="text-sm text-ink/60 hover:text-lime transition-colors mb-4 inline-flex items-center gap-1"
            >
              ← Back to Products
            </Link>

            <h1 className="font-handwritten text-4xl md:text-5xl font-bold text-ink mt-4 mb-8">
              Edit Product
              <span className="relative inline-block ml-2">
                <span className="relative z-10">.</span>
                <span className="absolute inset-0 bg-yellow opacity-60 -rotate-3 rounded" />
              </span>
            </h1>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            <div className="space-y-8">
              {/* Images */}
              <div className="bg-white border-2 border-ink/10 rounded-2xl p-6">
                <h2 className="font-semibold text-xl text-ink mb-4">Product Images</h2>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative group border-2 border-ink/10 rounded-lg overflow-hidden">
                      <img
                        src={image.url}
                        alt={image.altText}
                        className="w-full h-40 object-cover"
                      />
                      {image.isPrimary && (
                        <div className="absolute top-2 left-2 bg-lime text-ink text-xs font-medium px-2 py-1 rounded">
                          Primary
                        </div>
                      )}
                      <button
                        onClick={() => handleDeleteImage(index)}
                        disabled={uploadingImage}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                        title="Delete image"
                      >
                        Delete
                      </button>

                      <div className="p-2 bg-white border-t-2 border-ink/10 flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            const newImages = images.map((img, i) => ({
                              ...img,
                              isPrimary: i === index,
                            }));
                            setImages(newImages);
                          }}
                          disabled={image.isPrimary}
                          className="text-xs text-ink/60 hover:text-lime disabled:text-ink/30 disabled:cursor-not-allowed"
                        >
                          {image.isPrimary ? "✓ Primary" : "Set as primary"}
                        </button>

                        <label className="text-xs text-lime hover:text-lime/80 cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleReplaceImage(index, e)}
                            disabled={uploadingImage}
                            className="hidden"
                          />
                          Replace
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-2 border-dashed border-ink/20 rounded-xl p-6 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer inline-flex items-center gap-2"
                  >
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={uploadingImage}
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.preventDefault();
                        document.getElementById("image-upload")?.click();
                      }}
                    >
                      {uploadingImage ? "Uploading..." : "+ Upload Image"}
                    </Button>
                  </label>
                  <p className="text-xs text-ink/50 mt-2">JPG, PNG or WEBP. Max 5MB.</p>
                </div>
              </div>

              {/* Basic Information */}
              <div className="bg-white border-2 border-ink/10 rounded-2xl p-6">
                <h2 className="font-semibold text-xl text-ink mb-4">Basic Information</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">Product Name *</label>
                    <input
                      type="text"
                      value={product.name}
                      onChange={(e) => {
                        setProduct({ ...product, name: e.target.value, slug: generateSlug(e.target.value) });
                      }}
                      className="w-full px-4 py-3 border-2 border-ink/20 rounded-xl focus:border-lime focus:ring-2 focus:ring-lime/20 focus:outline-none"
                      placeholder="Modular Desk Organizer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">Slug *</label>
                    <input
                      type="text"
                      value={product.slug}
                      onChange={(e) => setProduct({ ...product, slug: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-ink/20 rounded-xl focus:border-lime focus:ring-2 focus:ring-lime/20 focus:outline-none"
                      placeholder="modular-desk-organizer"
                    />
                    <p className="text-xs text-ink/50 mt-1">Used in product URL</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">Category *</label>
                    <select
                      value={product.categoryId}
                      onChange={(e) => setProduct({ ...product, categoryId: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-ink/20 rounded-xl focus:border-lime focus:ring-2 focus:ring-lime/20 focus:outline-none"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">Short Description</label>
                    <input
                      type="text"
                      value={product.shortDescription}
                      onChange={(e) => setProduct({ ...product, shortDescription: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-ink/20 rounded-xl focus:border-lime focus:ring-2 focus:ring-lime/20 focus:outline-none"
                      placeholder="One-line summary for product cards"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">Full Description</label>
                    <textarea
                      value={product.description}
                      onChange={(e) => setProduct({ ...product, description: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-3 border-2 border-ink/20 rounded-xl focus:border-lime focus:ring-2 focus:ring-lime/20 focus:outline-none"
                      placeholder="Detailed product description..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-ink mb-2">Status</label>
                      <select
                        value={product.status}
                        onChange={(e) => setProduct({ ...product, status: e.target.value as any })}
                        className="w-full px-4 py-3 border-2 border-ink/20 rounded-xl focus:border-lime focus:ring-2 focus:ring-lime/20 focus:outline-none"
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>

                    <div className="flex items-center">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={product.featured}
                          onChange={(e) => setProduct({ ...product, featured: e.target.checked })}
                          className="w-5 h-5 border-2 border-ink/20 rounded focus:ring-2 focus:ring-lime/20"
                        />
                        <span className="text-sm font-medium text-ink">Featured Product</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Variants */}
              <VariantEditor
                variants={variants}
                materialRates={materialRates}
                onChange={setVariants}
              />

              {/* Actions */}
              <div className="flex gap-4">
                <Button
                  variant="accent"
                  size="lg"
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex-1"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Link href="/admin/products">
                  <Button variant="secondary" size="lg">
                    Cancel
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
