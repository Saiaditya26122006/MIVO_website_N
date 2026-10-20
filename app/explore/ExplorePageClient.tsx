"use client";

import { useState, useMemo } from "react";
import { ProductCard } from "@/components/products/ProductCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import type { ProductWithCategory, Category } from "@/lib/data/types";

interface ExplorePageClientProps {
  initialProducts: ProductWithCategory[];
  initialCategories: Category[];
}

export function ExplorePageClient({ initialProducts, initialCategories }: ExplorePageClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("name-asc");

  // Client-side filtering and sorting
  const filteredProducts = useMemo(() => {
    let results = [...initialProducts];

    // Apply search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.shortDescription.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower)
      );
    }

    // Apply category filter
    if (selectedCategory) {
      results = results.filter((p) => p.categoryId === selectedCategory);
    }

    // Apply sorting
    results = [...results].sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "price-asc": {
          const priceA = Math.min(...a.variants.map((v) => v.pricePaise));
          const priceB = Math.min(...b.variants.map((v) => v.pricePaise));
          return priceA - priceB;
        }
        case "price-desc": {
          const priceA = Math.min(...a.variants.map((v) => v.pricePaise));
          const priceB = Math.min(...b.variants.map((v) => v.pricePaise));
          return priceB - priceA;
        }
        default:
          return 0;
      }
    });

    return results;
  }, [initialProducts, searchQuery, selectedCategory, sortBy]);

  return (
    <>
      <Navigation />

      <main className="flex-1 pt-20">
        {/* Modern Header with Gradient */}
        <section className="relative py-16 md:py-20 bg-gradient-to-br from-cream via-cream to-lime/5 overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-lime/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-yellow/5 rounded-full blur-3xl" />

          <div className="max-w-7xl mx-auto px-6 relative">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-ink/50 mb-4">
              <span>Home</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-ink font-medium">Explore Models</span>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-center mb-8">
              {/* Left: Title */}
              <div>
                <h1 className="font-handwritten text-5xl md:text-7xl font-bold text-ink mb-3 leading-tight">
                  Ready-to-Order Models
                  <span className="relative inline-block ml-2">
                    <span className="relative z-10">.</span>
                    <span className="absolute inset-0 bg-yellow opacity-60 -rotate-3 rounded" />
                  </span>
                </h1>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur rounded-full border border-ink/10">
                    <div className="w-2 h-2 bg-lime rounded-full animate-pulse" />
                    <span className="font-semibold text-ink">{filteredProducts.length}</span>
                    <span className="text-ink/60">models available</span>
                  </div>
                </div>
              </div>

              {/* Right: Quick Stats */}
              <div className="hidden md:grid grid-cols-3 gap-4">
                <div className="bg-white/60 backdrop-blur border border-ink/10 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-bold text-ink mb-1">24-48h</div>
                  <div className="text-xs text-ink/60 uppercase tracking-wide">Turnaround</div>
                </div>
                <div className="bg-white/60 backdrop-blur border border-ink/10 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-bold text-ink mb-1">5+</div>
                  <div className="text-xs text-ink/60 uppercase tracking-wide">Materials</div>
                </div>
                <div className="bg-white/60 backdrop-blur border border-ink/10 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-bold text-ink mb-1">100%</div>
                  <div className="text-xs text-ink/60 uppercase tracking-wide">Custom</div>
                </div>
              </div>
            </div>

            {/* Search & Filters Card */}
            <div className="bg-white/80 backdrop-blur border-2 border-ink/10 rounded-2xl p-6 shadow-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Search with Icon */}
                <div className="md:col-span-2 relative">
                  <svg
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/40"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <Input
                    type="search"
                    placeholder="Search models, categories, or tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 bg-cream/50 border-ink/20"
                  />
                </div>

                {/* Sort with Icon */}
                <div className="relative">
                  <svg
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/40 pointer-events-none"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border-2 border-ink/20 rounded-lg bg-cream/50 text-ink font-medium focus:border-lime focus:ring-2 focus:ring-lime/20 focus:outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="name-asc">Name (A-Z)</option>
                    <option value="name-desc">Name (Z-A)</option>
                    <option value="price-asc">Price (Low to High)</option>
                    <option value="price-desc">Price (High to Low)</option>
                  </select>
                  <svg
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink/40 pointer-events-none"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-semibold text-ink/50 uppercase tracking-wide self-center mr-2">Filter:</span>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                    selectedCategory === null
                      ? "bg-lime text-ink shadow-md scale-105"
                      : "bg-ink/5 text-ink/70 hover:bg-ink/10 hover:scale-105"
                  }`}
                >
                  All Products
                </button>

                {initialCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                      selectedCategory === category.id
                        ? "bg-lime text-ink shadow-md scale-105"
                        : "bg-ink/5 text-ink/70 hover:bg-ink/10 hover:scale-105"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Products Grid */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-6">
            {filteredProducts.length === 0 ? (
              <EmptyState
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-24 w-24"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                }
                title="No products found"
                description="Try adjusting your search or filters to find what you're looking for."
                actionLabel="Clear Filters"
                actionHref="/explore"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
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
