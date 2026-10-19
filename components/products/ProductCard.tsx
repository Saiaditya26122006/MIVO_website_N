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
            className="object-contain p-6 group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-ink/20">
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
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
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
