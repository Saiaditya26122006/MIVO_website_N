"use client";

export const dynamic = 'force-dynamic';

import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/lib/context/CartContext";
import Link from "next/link";
import Image from "next/image";

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

export default function CartPage() {
  const { cart, summary, updateQuantity, removeItem } = useCart();

  if (cart.items.length === 0) {
    return (
      <>
        <Navigation />
        <main className="flex-1 pt-20 min-h-screen">
          <section className="py-16">
            <div className="max-w-4xl mx-auto px-6 text-center">
              <h1 className="font-handwritten text-4xl md:text-5xl font-bold text-ink mb-4">
                Your Cart
                <span className="relative inline-block ml-2">
                  <span className="relative z-10">.</span>
                  <span className="absolute inset-0 bg-yellow opacity-60 -rotate-3 rounded" />
                </span>
              </h1>

              <div className="mt-12 p-12 bg-white border-2 border-ink/10 rounded-2xl">
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
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>

                <p className="text-ink/70 text-lg mb-6">Your cart is empty</p>

                <Link href="/explore">
                  <Button variant="accent" size="lg" className="rounded-full">
                    Explore Products
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navigation />

      <main className="flex-1 pt-20 min-h-screen">
        <section className="py-12">
          <div className="max-w-6xl mx-auto px-6">
            <h1 className="font-handwritten text-4xl md:text-5xl font-bold text-ink mb-8">
              Your Cart
              <span className="relative inline-block ml-2">
                <span className="relative z-10">.</span>
                <span className="absolute inset-0 bg-yellow opacity-60 -rotate-3 rounded" />
              </span>
            </h1>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {cart.items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border-2 border-ink/10 rounded-2xl p-6 flex gap-6"
                  >
                    {/* Product Image */}
                    <Link
                      href={`/product/${item.productSlug}`}
                      className="flex-shrink-0"
                    >
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.productName}
                          width={120}
                          height={120}
                          className="rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-[120px] h-[120px] rounded-xl bg-gradient-to-br from-cream to-lime/10 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-lime/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5l2.25 1.313M3 7.5v2.25m9 3l2.25-1.313M12 12.75l-2.25-1.313M12 12.75V15m0 6.75l2.25-1.313M12 21.75V15m0 0l-2.25-1.313M3 16.5v2.25M21 16.5v2.25M12 3v2.25m6.75 12l2.25-1.313M5.25 17.25l-2.25-1.313" />
                          </svg>
                        </div>
                      )}
                    </Link>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/product/${item.productSlug}`}
                        className="font-semibold text-lg text-ink hover:text-lime transition-colors"
                      >
                        {item.productName}
                      </Link>

                      <div className="mt-2 text-sm text-ink/70 space-y-1">
                        <p>Size: {item.sizeName}</p>
                        <p>Material: {item.material}</p>
                        <p>Color: {item.selectedColor}</p>
                        <p className="text-xs text-ink/50">SKU: {item.variantSku}</p>
                      </div>

                      <div className="mt-4 flex items-center gap-4">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
                            }
                            disabled={item.quantity <= 1}
                            className="w-8 h-8 rounded-lg border-2 border-ink/20 flex items-center justify-center hover:bg-lime/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>

                          <span className="w-12 text-center font-medium">
                            {item.quantity}
                          </span>

                          <button
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
                            disabled={item.quantity >= 99}
                            className="w-8 h-8 rounded-lg border-2 border-ink/20 flex items-center justify-center hover:bg-lime/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-sm text-red-600 hover:text-red-700 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex-shrink-0 text-right">
                      <p className="font-semibold text-lg text-ink">
                        {formatPrice(item.unitPricePaise * item.quantity)}
                      </p>
                      <p className="text-sm text-ink/50">
                        {formatPrice(item.unitPricePaise)} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-white border-2 border-ink/10 rounded-2xl p-6 sticky top-24">
                  <h2 className="font-semibold text-xl text-ink mb-4">
                    Order Summary
                  </h2>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-ink/70">
                      <span>Subtotal</span>
                      <span>{formatPrice(summary.subtotalPaise)}</span>
                    </div>

                    <div className="flex justify-between text-ink/70">
                      <span>Shipping</span>
                      <span>{formatPrice(summary.shippingPaise)}</span>
                    </div>

                    <div className="border-t-2 border-ink/10 pt-3 flex justify-between font-semibold text-lg text-ink">
                      <span>Total</span>
                      <span>{formatPrice(summary.totalPaise)}</span>
                    </div>
                  </div>

                  <Link href="/checkout">
                    <Button
                      variant="accent"
                      size="lg"
                      className="w-full rounded-full"
                    >
                      Proceed to Checkout
                    </Button>
                  </Link>

                  <Link href="/explore">
                    <Button
                      variant="secondary"
                      size="md"
                      className="w-full rounded-full mt-3"
                    >
                      Continue Shopping
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
