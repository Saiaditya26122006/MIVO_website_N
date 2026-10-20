"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { createProduct } from "../actions";
import type { ProductFormData, ProductVariantFormData, ProductImageFormData } from "../actions";

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
      productionTimeHours: 24,
      isDefault: true,
    },
  ]);

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

  function addVariant() {
    setVariants([
      ...variants,
      {
        sku: "",
        sizeName: "",
        lengthMm: 0,
        widthMm: 0,
        heightMm: 0,
        material: "PLA",
        colorOptions: ["Natural"],
        pricePaise: 0,
        productionTimeHours: 24,
        isDefault: false,
      },
    ]);
  }

  function removeVariant(index: number) {
    if (variants.length === 1) {
      setError("At least one variant is required");
      return;
    }
    const newVariants = variants.filter((_, i) => i !== index);
    // Ensure at least one default
    if (!newVariants.some((v) => v.isDefault)) {
      newVariants[0].isDefault = true;
    }
    setVariants(newVariants);
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
              <div className="bg-white border-2 border-ink/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-xl text-ink">Variants</h2>
                  <Button variant="secondary" size="sm" onClick={addVariant}>
                    + Add Variant
                  </Button>
                </div>

                <div className="space-y-4">
                  {variants.map((variant, index) => (
                    <div key={index} className="border-2 border-ink/10 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-ink">Variant {index + 1}</h3>
                        {variants.length > 1 && (
                          <button
                            onClick={() => removeVariant(index)}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-ink/60 mb-1">SKU *</label>
                          <input
                            type="text"
                            value={variant.sku}
                            onChange={(e) => {
                              const newVariants = [...variants];
                              newVariants[index].sku = e.target.value;
                              setVariants(newVariants);
                            }}
                            className="w-full px-3 py-2 text-sm border-2 border-ink/20 rounded-lg focus:border-lime focus:outline-none"
                            placeholder="MDO-S-PLA"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-ink/60 mb-1">Size Name *</label>
                          <input
                            type="text"
                            value={variant.sizeName}
                            onChange={(e) => {
                              const newVariants = [...variants];
                              newVariants[index].sizeName = e.target.value;
                              setVariants(newVariants);
                            }}
                            className="w-full px-3 py-2 text-sm border-2 border-ink/20 rounded-lg focus:border-lime focus:outline-none"
                            placeholder="Small"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-ink/60 mb-1">Length (mm) *</label>
                          <input
                            type="number"
                            value={variant.lengthMm}
                            onChange={(e) => {
                              const newVariants = [...variants];
                              newVariants[index].lengthMm = parseInt(e.target.value) || 0;
                              setVariants(newVariants);
                            }}
                            className="w-full px-3 py-2 text-sm border-2 border-ink/20 rounded-lg focus:border-lime focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-ink/60 mb-1">Width (mm) *</label>
                          <input
                            type="number"
                            value={variant.widthMm}
                            onChange={(e) => {
                              const newVariants = [...variants];
                              newVariants[index].widthMm = parseInt(e.target.value) || 0;
                              setVariants(newVariants);
                            }}
                            className="w-full px-3 py-2 text-sm border-2 border-ink/20 rounded-lg focus:border-lime focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-ink/60 mb-1">Height (mm) *</label>
                          <input
                            type="number"
                            value={variant.heightMm}
                            onChange={(e) => {
                              const newVariants = [...variants];
                              newVariants[index].heightMm = parseInt(e.target.value) || 0;
                              setVariants(newVariants);
                            }}
                            className="w-full px-3 py-2 text-sm border-2 border-ink/20 rounded-lg focus:border-lime focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-ink/60 mb-1">Material *</label>
                          <input
                            type="text"
                            value={variant.material}
                            onChange={(e) => {
                              const newVariants = [...variants];
                              newVariants[index].material = e.target.value;
                              setVariants(newVariants);
                            }}
                            className="w-full px-3 py-2 text-sm border-2 border-ink/20 rounded-lg focus:border-lime focus:outline-none"
                            placeholder="PLA"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-ink/60 mb-1">Price (₹) *</label>
                          <input
                            type="number"
                            value={variant.pricePaise / 100}
                            onChange={(e) => {
                              const newVariants = [...variants];
                              newVariants[index].pricePaise = Math.round((parseFloat(e.target.value) || 0) * 100);
                              setVariants(newVariants);
                            }}
                            step="0.01"
                            className="w-full px-3 py-2 text-sm border-2 border-ink/20 rounded-lg focus:border-lime focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-ink/60 mb-1">Production Time (hrs)</label>
                          <input
                            type="number"
                            value={variant.productionTimeHours || ""}
                            onChange={(e) => {
                              const newVariants = [...variants];
                              newVariants[index].productionTimeHours = parseInt(e.target.value) || null;
                              setVariants(newVariants);
                            }}
                            className="w-full px-3 py-2 text-sm border-2 border-ink/20 rounded-lg focus:border-lime focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={variant.isDefault}
                          onChange={(e) => {
                            const newVariants = variants.map((v, i) => ({
                              ...v,
                              isDefault: i === index ? e.target.checked : false,
                            }));
                            setVariants(newVariants);
                          }}
                          className="w-4 h-4 border-2 border-ink/20 rounded"
                        />
                        <label className="text-sm text-ink/70">Default variant</label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

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
