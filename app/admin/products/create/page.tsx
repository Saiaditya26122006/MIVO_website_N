"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { createProduct, uploadProductImage } from "../actions";
import type { ProductFormData, ProductVariantFormData, ProductImageFormData } from "../actions";
import { VariantEditor } from "@/components/admin/VariantEditor";

interface Category {
  id: string;
  name: string;
}

export default function CreateProductPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [tempProductId, setTempProductId] = useState<string | null>(null);

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

  const [variants, setVariants] = useState<ProductVariantFormData[]>([
    {
      sku: "",
      sizeName: "",
      lengthMm: 0,
      widthMm: 0,
      heightMm: 0,
      material: "PLA",
      colorOptions: ["Natural"],
      pricePaise: 0,
      productionWeightGrams: null,
      productionTimeHours: 24,
      isActive: true,
      isDefault: true,
    },
  ]);

  const [materialRates, setMaterialRates] = useState<Record<string, number>>({
    PLA: 500, // ₹5/g = 500 paise/g
    PETG: 600,
    TPU: 800,
  });

  const [images, setImages] = useState<ProductImageFormData[]>([]);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login?redirect=/admin/products/create");
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
      if (cats && cats.length > 0) {
        setProduct((p) => ({ ...p, categoryId: cats[0].id }));
      }

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

      setLoading(false);
    }

    init();
  }, [router]);

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
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

    // For create page, we'll store the file and upload during product creation
    // Or we can upload to a temp folder
    // For simplicity, let's just show a preview without actual upload
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setImages([
        ...images,
        {
          url,
          altText: product.name || "Product image",
          displayOrder: images.length,
          isPrimary: images.length === 0,
        },
      ]);
    };
    reader.readAsDataURL(file);
  }

  function handleDeleteImage(index: number) {
    setImages(images.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setError(null);
    setSaving(true);

    const result = await createProduct(product, variants, images);

    if (!result.success) {
      setError(result.error || "Failed to create product");
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
          <p className="text-ink/60">Loading...</p>
        </main>
        <Footer />
      </>
    );
  }

  if (!isAdmin) {
    return null;
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
              Create Product
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
                <h2 className="font-semibold text-xl text-ink mb-4">Product Images (Optional)</h2>
                <p className="text-sm text-ink/60 mb-4">You can add images after creating the product</p>

                {images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    {images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image.url}
                          alt={image.altText}
                          className="w-full h-40 object-cover rounded-lg border-2 border-ink/10"
                        />
                        {image.isPrimary && (
                          <div className="absolute top-2 left-2 bg-lime text-ink text-xs font-medium px-2 py-1 rounded">
                            Primary
                          </div>
                        )}
                        <button
                          onClick={() => handleDeleteImage(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-2 border-dashed border-ink/20 rounded-xl p-6 text-center">
                  <p className="text-sm text-ink/60">Note: Image upload will be available after product creation</p>
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
                  {saving ? "Creating..." : "Create Product"}
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
