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
      <div className="h-[600px] flex items-center justify-center">
        <div className="text-ink/40">Loading products...</div>
      </div>
    );
  }

  return (
    <div
      className="relative h-[600px] overflow-hidden"
      style={{ maskImage: 'linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)' }}
    >
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
                          className="object-cover group-hover:scale-105 transition-transform"
                          sizes="200px"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-cream to-lime/10">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-10 w-10 text-lime/40"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V15m0 0l-2.25-1.313M3 16.5v2.25M21 16.5v2.25M12 3v2.25m6.75 12l2.25-1.313M5.25 17.25l-2.25-1.313"
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

    </div>
  );
}
