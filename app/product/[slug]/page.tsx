"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/Loading";
import { useCart } from "@/lib/context/CartContext";
import type { ProductWithCategory, ProductVariant } from "@/lib/data/types";
import { getProductBySlug } from "@/services/products.service";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

function ProductDetailContent() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { addItem } = useCart();

  const [product, setProduct] = useState<ProductWithCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      try {
        const data = await getProductBySlug(slug);
        if (!data) {
          setNotFound(true);
        } else {
          setProduct(data);
          // Select default variant or first variant
          const defaultVariant = data.variants.find((v) => v.isDefault) || data.variants[0];
          setSelectedVariant(defaultVariant);
          // Set default color if available
          if (defaultVariant && defaultVariant.colorOptions.length > 0) {
            setSelectedColor(defaultVariant.colorOptions[0]);
          }
        }
      } catch (error) {
        console.error("Error loading product:", error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [slug]);

  // Reset color when variant changes
  useEffect(() => {
    if (selectedVariant && selectedVariant.colorOptions.length > 0) {
      setSelectedColor(selectedVariant.colorOptions[0]);
    } else {
      setSelectedColor("");
    }
  }, [selectedVariant]);

  function handleAddToCart() {
    if (!product || !selectedVariant) return;

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

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="flex-1 pt-20 min-h-screen flex items-center justify-center">
          <Loading text="Loading product..." size="lg" />
        </main>
        <Footer />
      </>
    );
  }

  if (notFound || !product) {
    return (
      <>
        <Navigation />
        <main className="flex-1 pt-20 min-h-screen">
          <div className="max-w-7xl mx-auto px-6 py-24 text-center">
            <div className="space-y-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-24 w-24 mx-auto text-ink/20"
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
              <h1 className="font-handwritten text-5xl font-bold text-ink">Product Not Found</h1>
              <p className="text-ink/70 text-lg max-w-md mx-auto">
                The product you're looking for doesn't exist or has been removed.
              </p>
              <Link href="/explore">
                <Button variant="accent" size="lg" className="rounded-xl">
                  Browse All Products
                </Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
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
                {/* Main Image */}
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

                {/* Thumbnail Navigation */}
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
                {/* Header */}
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
                          {variant.colorOptions.length > 0 && (
                            <div className="text-xs text-ink/60 mt-1">
                              Colors: {variant.colorOptions.join(", ")}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selected Variant Details */}
                  {selectedVariant && (
                    <div className="bg-white border-2 border-ink/10 rounded-2xl p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-ink/60 mb-1">Dimensions</div>
                          <div className="font-medium text-ink">
                            {selectedVariant.dimensions.lengthMm} × {selectedVariant.dimensions.widthMm} ×{" "}
                            {selectedVariant.dimensions.heightMm} mm
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-ink/60 mb-1">Material</div>
                          <div className="font-medium text-ink">{selectedVariant.material}</div>
                        </div>
                        {selectedVariant.productionTimeHours && (
                          <div>
                            <div className="text-xs text-ink/60 mb-1">Production Time</div>
                            <div className="font-medium text-ink">
                              {Math.ceil(selectedVariant.productionTimeHours / 24)} days
                            </div>
                          </div>
                        )}
                        <div>
                          <div className="text-xs text-ink/60 mb-1">SKU</div>
                          <div className="font-mono text-sm text-ink/80">{selectedVariant.sku}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Color Selection */}
                {selectedVariant && selectedVariant.colorOptions.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-ink mb-3">
                      Select Color
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedVariant.colorOptions.map((color) => (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className={`px-4 py-2 border-2 rounded-lg font-medium transition-all ${
                            selectedColor === color
                              ? "border-lime bg-lime/10 text-ink"
                              : "border-ink/20 text-ink/70 hover:border-lime/50"
                          }`}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity Selector */}
                <div>
                  <label className="block text-sm font-medium text-ink mb-3">
                    Quantity
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="w-10 h-10 rounded-lg border-2 border-ink/20 flex items-center justify-center hover:bg-lime/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                      className="w-20 text-center font-medium text-lg border-2 border-ink/20 rounded-lg py-2"
                    />

                    <button
                      onClick={() => setQuantity(Math.min(99, quantity + 1))}
                      disabled={quantity >= 99}
                      className="w-10 h-10 rounded-lg border-2 border-ink/20 flex items-center justify-center hover:bg-lime/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Add to Cart */}
                <div className="space-y-3">
                  <Button
                    variant="accent"
                    size="lg"
                    className="w-full rounded-xl"
                    onClick={handleAddToCart}
                    disabled={!selectedVariant || (selectedVariant.colorOptions.length > 0 && !selectedColor) || addingToCart}
                  >
                    {addingToCart ? "Adding..." : "Add to Cart"}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </Button>
                  <p className="text-xs text-center text-ink/60">
                    Made to order • Ships in{" "}
                    {selectedVariant?.productionTimeHours
                      ? Math.ceil(selectedVariant.productionTimeHours / 24)
                      : "2-3"}{" "}
                    days
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Product Description & Specifications */}
        <section className="py-12 bg-cream border-t border-ink/10">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Description */}
              <div>
                <h2 className="font-handwritten text-3xl font-bold text-ink mb-4">
                  Description
                </h2>
                <div className="prose prose-ink max-w-none">
                  <p className="text-ink/80 leading-relaxed whitespace-pre-line">
                    {product.description}
                  </p>
                </div>

                {/* Features */}
                {product.features.length > 0 && (
                  <div className="mt-8">
                    <h3 className="font-semibold text-xl text-ink mb-4">Key Features</h3>
                    <ul className="space-y-2">
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

              {/* Specifications */}
              {Object.keys(product.specifications).length > 0 && (
                <div>
                  <h2 className="font-handwritten text-3xl font-bold text-ink mb-4">
                    Specifications
                  </h2>
                  <div className="bg-white border-2 border-ink/10 rounded-2xl overflow-hidden">
                    <table className="w-full">
                      <tbody>
                        {Object.entries(product.specifications).map(([key, value], idx) => (
                          <tr
                            key={key}
                            className={idx % 2 === 0 ? "bg-cream/30" : "bg-white"}
                          >
                            <td className="px-6 py-3 text-sm font-medium text-ink/70 w-1/3">
                              {key}
                            </td>
                            <td className="px-6 py-3 text-sm text-ink">{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

export default function ProductDetailPage() {
  return (
    <Suspense fallback={
      <>
        <Navigation />
        <main className="flex-1 pt-20 min-h-screen flex items-center justify-center">
          <Loading text="Loading product..." size="lg" />
        </main>
        <Footer />
      </>
    }>
      <ProductDetailContent />
    </Suspense>
  );
}
