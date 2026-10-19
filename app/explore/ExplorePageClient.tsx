"use client";

import { useState, useMemo } from "react";
import { ProductCard } from "@/components/products/ProductCard";
import { Loading } from "@/components/ui/Loading";
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
        {/* Header */}
        <section className="py-12 bg-cream border-b border-ink/10">
          <div className="max-w-7xl mx-auto px-6">
            <h1 className="font-handwritten text-5xl md:text-7xl font-bold text-ink mb-4">
              Ready-to-Order Models
              <span className="relative inline-block ml-2">
                <span className="relative z-10">.</span>
                <span className="absolute inset-0 bg-yellow opacity-60 -rotate-3 rounded" />
              </span>
            </h1>

            <div className="flex items-center gap-2 text-ink/70">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-lime"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium">{filteredProducts.length} products available</span>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="py-8 bg-white border-b border-ink/10">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Search */}
              <div className="md:col-span-2">
                <Input
                  type="search"
                  placeholder="Search by name, category, or tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Sort */}
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-ink/20 rounded-lg bg-white text-ink focus:border-lime focus:ring-2 focus:ring-lime/20 focus:outline-none transition-all"
                >
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                  <option value="price-asc">Price (Low to High)</option>
                  <option value="price-desc">Price (High to Low)</option>
                </select>
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-3 mt-6">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-6 py-2 rounded-full font-medium transition-all ${
                  selectedCategory === null
                    ? "bg-lime text-ink shadow-md"
                    : "bg-white text-ink/70 border-2 border-ink/10 hover:border-lime/50 hover:bg-lime/5"
                }`}
              >
                All Products
              </button>

              {initialCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-6 py-2 rounded-full font-medium transition-all ${
                    selectedCategory === category.id
                      ? "bg-lime text-ink shadow-md"
                      : "bg-white text-ink/70 border-2 border-ink/10 hover:border-lime/50 hover:bg-lime/5"
                  }`}
                >
                  {category.name}
                </button>
              ))}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
