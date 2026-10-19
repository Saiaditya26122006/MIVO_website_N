"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/lib/context/CartContext";
import type { ProductWithCategory, ProductVariant } from "@/lib/data/types";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

interface ProductDetailClientProps {
  product: ProductWithCategory;
}

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const router = useRouter();
  const { addItem } = useCart();

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    const defaultVariant = product.variants.find((v) => v.isDefault) || product.variants[0];
    setSelectedVariant(defaultVariant);
    if (defaultVariant && defaultVariant.colorOptions.length > 0) {
      setSelectedColor(defaultVariant.colorOptions[0]);
    }
  }, [product]);

  useEffect(() => {
    if (selectedVariant && selectedVariant.colorOptions.length > 0) {
      setSelectedColor(selectedVariant.colorOptions[0]);
    } else {
      setSelectedColor("");
    }
  }, [selectedVariant]);

  function handleAddToCart() {
    if (!selectedVariant) return;

    setAddingToCart(true);

    const primaryImage = product.images.find((img) => img.isPrimary) || product.images[0];

    addItem({
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      variantId: selectedVariant.id,
      variantSku: selectedVariant.sku,
      sizeName: selectedVariant.sizeName,
      material: selectedVariant.material,
      selectedColor: selectedColor || "Default",
      quantity,
      unitPricePaise: selectedVariant.pricePaise,
      imageUrl: primaryImage?.url || "/placeholder-product.png",
    });

    setTimeout(() => {
      setAddingToCart(false);
      router.push("/cart");
    }, 500);
  }

  const primaryImage = product.images[selectedImage] || product.images[0];
  const lowestPrice = Math.min(...product.variants.map((v) => v.pricePaise));
  const highestPrice = Math.max(...product.variants.map((v) => v.pricePaise));

  return (
    <>
      <Navigation />

      <main className="flex-1 pt-20">
        {/* Breadcrumb */}
        <section className="py-6 border-b border-ink/10">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center gap-2 text-sm text-ink/60">
              <Link href="/" className="hover:text-lime transition-colors">
                Home
              </Link>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <Link href="/explore" className="hover:text-lime transition-colors">
                Explore
              </Link>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <Link href={`/explore?category=${product.categoryId}`} className="hover:text-lime transition-colors">
                {product.category.name}
              </Link>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-ink font-medium">{product.name}</span>
            </div>
          </div>
        </section>

        {/* Product Details */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Left Column - Image Gallery */}
              <div className="space-y-4">
                <div className="aspect-square bg-cream/50 rounded-3xl border-2 border-ink/10 overflow-hidden relative">
                  {primaryImage ? (
                    <Image
                      src={primaryImage.url}
                      alt={primaryImage.altText}
                      fill
                      className="object-contain p-8"
                      priority
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-ink/20">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-32 w-32"
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

                  {product.madeToOrder && (
                    <div className="absolute top-4 right-4 bg-lime text-ink text-sm font-semibold px-4 py-2 rounded-full shadow-lg">
                      Made to Order
                    </div>
                  )}
                </div>

                {product.images.length > 1 && (
                  <div className="grid grid-cols-4 gap-3">
                    {product.images.map((image, idx) => (
                      <button
                        key={image.id}
                        onClick={() => setSelectedImage(idx)}
                        className={`aspect-square bg-cream/50 rounded-xl border-2 overflow-hidden transition-all ${
                          selectedImage === idx
                            ? "border-lime shadow-md"
                            : "border-ink/10 hover:border-lime/50"
                        }`}
                      >
                        <div className="relative w-full h-full">
                          <Image
                            src={image.url}
                            alt={image.altText}
                            fill
                            className="object-contain p-2"
                          />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column - Product Info */}
              <div className="space-y-8">
                <div>
                  <div className="text-sm font-medium text-ink/60 mb-2">
                    {product.category.name}
                  </div>
                  <h1 className="font-handwritten text-4xl md:text-5xl font-bold text-ink mb-4">
                    {product.name}
                  </h1>
                  <p className="text-lg text-ink/80 leading-relaxed">
                    {product.shortDescription}
                  </p>
                </div>

                {/* Price Range */}
                <div className="bg-cream/50 border-2 border-ink/10 rounded-2xl p-6">
                  <div className="text-sm text-ink/60 mb-2">Price Range</div>
                  <div className="text-3xl font-bold text-ink">
                    {lowestPrice === highestPrice
                      ? formatPrice(lowestPrice)
                      : `${formatPrice(lowestPrice)} - ${formatPrice(highestPrice)}`}
                  </div>
                </div>

                {/* Variant Selector */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-ink mb-3">
                      Select Variant
                    </label>
                    <div className="grid grid-cols-1 gap-3">
                      {product.variants.map((variant) => (
                        <button
                          key={variant.id}
                          onClick={() => setSelectedVariant(variant)}
                          className={`p-4 border-2 rounded-xl text-left transition-all ${
                            selectedVariant?.id === variant.id
                              ? "border-lime bg-lime/5 shadow-md"
                              : "border-ink/10 hover:border-lime/50 bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-semibold text-ink">
                              {variant.sizeName} - {variant.material}
                            </div>
                            <div className="text-xl font-bold text-ink">
                              {formatPrice(variant.pricePaise)}
                            </div>
                          </div>
                          <div className="text-sm text-ink/60">
                            {variant.dimensions.lengthMm} × {variant.dimensions.widthMm} × {variant.dimensions.heightMm} mm
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Selector */}
                  {selectedVariant && selectedVariant.colorOptions.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-ink mb-3">
                        Color
                      </label>
                      <div className="flex flex-wrap gap-3">
                        {selectedVariant.colorOptions.map((color) => (
                          <button
                            key={color}
                            onClick={() => setSelectedColor(color)}
                            className={`px-5 py-2.5 border-2 rounded-xl font-medium transition-all ${
                              selectedColor === color
                                ? "border-lime bg-lime/5 shadow-md text-ink"
                                : "border-ink/10 hover:border-lime/50 bg-white text-ink/70"
                            }`}
                          >
                            {color}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quantity */}
                  <div>
                    <label className="block text-sm font-medium text-ink mb-3">
                      Quantity
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-12 h-12 rounded-xl border-2 border-ink/20 hover:border-lime hover:bg-lime/5 transition-all flex items-center justify-center font-bold text-lg"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setQuantity(Math.max(1, Math.min(99, val)));
                        }}
                        className="w-20 text-center px-4 py-3 border-2 border-ink/20 rounded-xl focus:border-lime focus:ring-2 focus:ring-lime/20 focus:outline-none text-lg font-semibold"
                      />
                      <button
                        onClick={() => setQuantity(Math.min(99, quantity + 1))}
                        className="w-12 h-12 rounded-xl border-2 border-ink/20 hover:border-lime hover:bg-lime/5 transition-all flex items-center justify-center font-bold text-lg"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Add to Cart */}
                <div className="pt-4 space-y-4">
                  {selectedVariant && (
                    <div className="flex items-center justify-between text-lg">
                      <span className="text-ink/70">Total</span>
                      <span className="text-2xl font-bold text-ink">
                        {formatPrice(selectedVariant.pricePaise * quantity)}
                      </span>
                    </div>
                  )}

                  <Button
                    variant="accent"
                    size="lg"
                    className="w-full rounded-xl text-lg py-4"
                    onClick={handleAddToCart}
                    disabled={addingToCart || !selectedVariant}
                  >
                    {addingToCart ? "Adding to Cart..." : "Add to Cart"}
                  </Button>
                </div>

                {/* Features */}
                {product.features && product.features.length > 0 && (
                  <div className="border-t-2 border-ink/10 pt-8">
                    <h3 className="text-sm font-medium text-ink mb-4">Key Features</h3>
                    <ul className="space-y-3">
                      {product.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-lime flex-shrink-0 mt-0.5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-ink/80">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Full Description */}
            <div className="mt-16 border-t-2 border-ink/10 pt-12">
              <h2 className="font-handwritten text-3xl font-bold text-ink mb-6">
                About this product
              </h2>
              <div className="prose prose-lg max-w-none text-ink/80">
                <p>{product.description}</p>
              </div>

              {/* Specifications */}
              {product.specifications && Object.keys(product.specifications).length > 0 && (
                <div className="mt-12">
                  <h3 className="text-xl font-bold text-ink mb-6">Specifications</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex justify-between p-4 bg-cream/30 rounded-xl border border-ink/5"
                      >
                        <span className="font-medium text-ink/70 capitalize">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                        <span className="font-semibold text-ink">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
