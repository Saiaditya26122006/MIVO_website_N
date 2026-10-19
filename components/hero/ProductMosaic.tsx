"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { ProductWithCategory } from "@/lib/data/types";
import { getProducts } from "@/services/products.service";

interface Column {
  id: number;
  products: ProductWithCategory[];
  speed: number;
  direction: "up" | "down";
}

export function ProductMosaic() {
  const [columns, setColumns] = useState<Column[]>([]);

  useEffect(() => {
    async function loadProducts() {
      const products = await getProducts();

      // Split products into 3 columns
      const columnCount = 3;
      const productsPerColumn = Math.ceil(products.length / columnCount);

      const cols: Column[] = [
        {
          id: 1,
          products: products.slice(0, productsPerColumn),
          speed: 30,
          direction: "down",
        },
        {
          id: 2,
          products: products.slice(productsPerColumn, productsPerColumn * 2),
          speed: 40,
          direction: "up",
        },
        {
          id: 3,
          products: products.slice(productsPerColumn * 2),
          speed: 35,
          direction: "down",
        },
      ];

      setColumns(cols);
    }

    loadProducts();
  }, []);

  if (columns.length === 0) {
    return (
      <div className="h-[600px] rounded-3xl bg-ink/5 border-2 border-ink/10 flex items-center justify-center">
        <div className="text-ink/40">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="relative h-[600px] overflow-hidden rounded-3xl border-2 border-ink/10 bg-cream/30">
      <div className="flex gap-4 h-full">
        {columns.map((column) => (
          <div key={column.id} className="flex-1 relative overflow-hidden">
            <div
              className="flex flex-col gap-4 animate-scroll"
              style={{
                animationDuration: `${column.speed}s`,
                animationDirection: column.direction === "up" ? "reverse" : "normal",
              }}
            >
              {/* Duplicate products for seamless loop */}
              {[...column.products, ...column.products].map((product, idx) => {
                const primaryImage = product.images.find((img) => img.isPrimary) || product.images[0];

                return (
                  <div
                    key={`${product.id}-${idx}`}
                    className="bg-white rounded-2xl border-2 border-ink/10 p-4 hover:border-lime transition-colors group"
                  >
                    <div className="aspect-square bg-cream/50 rounded-xl overflow-hidden mb-3 relative">
                      {primaryImage ? (
                        <Image
                          src={primaryImage.url}
                          alt={primaryImage.altText}
                          fill
                          className="object-contain p-2 group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-ink/20">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-12 w-12"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium text-ink line-clamp-2">
                      {product.name}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Gradient overlays for fade effect */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-cream/30 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-cream/30 to-transparent pointer-events-none" />
    </div>
  );
}
