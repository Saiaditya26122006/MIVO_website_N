import Link from "next/link";
import Image from "next/image";
import type { ProductWithCategory } from "@/lib/data/types";
import { formatPrice } from "@/lib/utils";

interface ProductCardProps {
  product: ProductWithCategory;
}

/**
 * Product Card Component
 *
 * Displays product thumbnail, name, category, and starting price
 */
export function ProductCard({ product }: ProductCardProps) {
  const primaryImage = product.images.find((img) => img.isPrimary) || product.images[0];
  const lowestPrice = Math.min(...product.variants.map((v) => v.pricePaise));

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group block bg-white border-2 border-ink/10 rounded-2xl overflow-hidden hover:border-lime hover:shadow-lg transition-all duration-300"
    >
      {/* Image */}
      <div className="aspect-square bg-cream/50 relative overflow-hidden">
        {primaryImage ? (
          <Image
            src={primaryImage.url}
            alt={primaryImage.altText}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-cream to-lime/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-lime/40"
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
            <span className="text-xs font-medium text-ink/30 mt-2">Made to Order</span>
          </div>
        )}

        {/* Made to Order Badge */}
        {product.madeToOrder && (
          <div className="absolute top-3 right-3 bg-lime text-ink text-xs font-semibold px-3 py-1 rounded-full">
            Made to Order
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="text-sm text-ink/60 font-medium mb-2">
          {product.category.name}
        </div>

        <h3 className="font-semibold text-lg text-ink mb-2 line-clamp-2 group-hover:text-ink/80 transition-colors">
          {product.name}
        </h3>

        <p className="text-sm text-ink/70 mb-4 line-clamp-2">
          {product.shortDescription}
        </p>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-ink/60">Starting from</div>
            <div className="text-2xl font-bold text-ink">{formatPrice(lowestPrice)}</div>
          </div>

          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-lime group-hover:translate-x-1 transition-transform"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </div>
      </div>
    </Link>
  );
}
