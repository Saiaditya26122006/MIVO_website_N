"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface ProductSummary {
  id: string;
  name: string;
  description: string;
  categoryName: string;
  variantCount: number;
  minPrice: number;
  maxPrice: number;
  isActive: boolean;
}

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function loadProducts() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login?redirect=/admin/products");
        return;
      }

      // Check admin status
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

      // Load products with variants
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          id,
          name,
          description,
          is_active,
          category:categories(name),
          variants:product_variants(price_paise)
        `)
        .order("name");

      if (productsError) {
        console.error("[Admin Products] Failed to load:", productsError);
        setLoading(false);
        return;
      }

      const productsList: ProductSummary[] = (productsData || []).map((p: Record<string, unknown>) => {
        const variants = (p.variants as { price_paise: number }[]) || [];
        const prices = variants.map(v => v.price_paise);

        return {
          id: p.id as string,
          name: p.name as string,
          description: p.description as string,
          categoryName: ((p.category as Record<string, unknown> | null)?.name as string) || "Uncategorized",
          variantCount: variants.length,
          minPrice: prices.length > 0 ? Math.min(...prices) : 0,
          maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
          isActive: p.is_active as boolean,
        };
      });

      setProducts(productsList);
      setLoading(false);
    }

    loadProducts();
  }, [router]);

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="flex-1 pt-20 min-h-screen flex items-center justify-center">
          <p className="text-ink/60">Loading products...</p>
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
          <div className="max-w-6xl mx-auto px-6">
            <div className="mb-8">
              <Link
                href="/admin"
                className="text-sm text-ink/60 hover:text-lime transition-colors mb-4 inline-flex items-center gap-1"
              >
                ← Back to Dashboard
              </Link>

              <div className="flex items-center justify-between flex-wrap gap-4 mt-4">
                <h1 className="font-handwritten text-4xl md:text-5xl font-bold text-ink">
                  Product Management
                  <span className="relative inline-block ml-2">
                    <span className="relative z-10">.</span>
                    <span className="absolute inset-0 bg-yellow opacity-60 -rotate-3 rounded" />
                  </span>
                </h1>

                <Link href="/admin/products/create">
                  <Button variant="accent" size="md" className="rounded-full">
                    + Add Product
                  </Button>
                </Link>
              </div>
            </div>

            {products.length === 0 ? (
              <div className="bg-white border-2 border-ink/10 rounded-2xl p-12 text-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16 mx-auto text-ink/30 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>

                <p className="text-ink/70 text-lg mb-6">No products found</p>

                <Link href="/admin/products/create">
                  <Button variant="accent" size="lg" className="rounded-full">
                    Create First Product
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {products.map((product) => (
                  <Link
                    key={product.id}
                    href={`/admin/products/${product.id}`}
                    className="block bg-white border-2 border-ink/10 rounded-2xl p-6 hover:border-lime/50 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-xl text-ink">{product.name}</h3>

                          {!product.isActive && (
                            <span className="px-3 py-1 rounded-full border-2 text-xs font-medium bg-gray-100 text-gray-600 border-gray-300">
                              Inactive
                            </span>
                          )}
                        </div>

                        <p className="text-ink/70 text-sm mb-3 line-clamp-2">{product.description}</p>

                        <div className="flex flex-wrap gap-4 text-sm text-ink/60">
                          <div className="flex items-center gap-1">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                              />
                            </svg>
                            <span>{product.categoryName}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                              />
                            </svg>
                            <span>{product.variantCount} {product.variantCount === 1 ? 'variant' : 'variants'}</span>
                          </div>

                          {product.minPrice > 0 && (
                            <div className="flex items-center gap-1 font-medium text-ink">
                              <span>
                                {product.minPrice === product.maxPrice
                                  ? formatPrice(product.minPrice)
                                  : `${formatPrice(product.minPrice)} - ${formatPrice(product.maxPrice)}`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-sm text-ink/60">
                        Edit →
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
