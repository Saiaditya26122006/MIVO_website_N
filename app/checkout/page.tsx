"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useCart } from "@/lib/context/CartContext";
import { createClient } from "@/lib/supabase/client";
import type { CheckoutFormData } from "@/lib/data/cart-types";

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, summary, clearCart } = useCart();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey] = useState(
    () => `checkout_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  );
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const orderCompleteRef = useRef(false);

  const [formData, setFormData] = useState<CheckoutFormData>({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    shippingAddressLine1: "",
    shippingAddressLine2: "",
    shippingCity: "",
    shippingState: "",
    shippingPostalCode: "",
    shippingCountry: "IN",
    specialInstructions: "",
  });

  // Check authentication and load profile
  useEffect(() => {
    async function loadUserAndProfile() {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        router.push("/auth/login?redirect=/checkout");
        return;
      }

      setUser({ id: authUser.id, email: authUser.email! });

      // Try to load profile data
      const { data: profile } = await supabase
        .from("customer_profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (profile) {
        setFormData({
          customerName: profile.display_name || "",
          customerEmail: authUser.email!,
          customerPhone: profile.phone || "",
          shippingAddressLine1: profile.address_line1 || "",
          shippingAddressLine2: profile.address_line2 || "",
          shippingCity: profile.city || "",
          shippingState: profile.state || "",
          shippingPostalCode: profile.postal_code || "",
          shippingCountry: profile.country || "IN",
          specialInstructions: "",
        });
      } else {
        setFormData((prev) => ({ ...prev, customerEmail: authUser.email! }));
      }

      setLoading(false);
    }

    loadUserAndProfile();
  }, [router]);

  // Redirect if cart is empty — but only when the user hasn't just placed an
  // order.  After a successful submit we call clearCart() then router.push()
  // to the order page.  Without the guard the empty-cart watcher would fire
  // first and redirect to /cart, hijacking the success redirect.
  useEffect(() => {
    if (!loading && cart.items.length === 0 && !orderCompleteRef.current) {
      router.push("/cart");
    }
  }, [cart.items.length, loading, router]);

  function handleInputChange(field: keyof CheckoutFormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    if (!formData.customerName.trim()) {
      errors.customerName = "Name is required";
    }

    if (!formData.customerEmail.trim()) {
      errors.customerEmail = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) {
      errors.customerEmail = "Invalid email address";
    }

    if (!formData.customerPhone.trim()) {
      errors.customerPhone = "Phone number is required";
    } else if (!/^\+?[\d\s-]{10,}$/.test(formData.customerPhone)) {
      errors.customerPhone = "Invalid phone number";
    }

    if (!formData.shippingAddressLine1.trim()) {
      errors.shippingAddressLine1 = "Address is required";
    }

    if (!formData.shippingCity.trim()) {
      errors.shippingCity = "City is required";
    }

    if (!formData.shippingState.trim()) {
      errors.shippingState = "State is required";
    }

    if (!formData.shippingPostalCode.trim()) {
      errors.shippingPostalCode = "Postal code is required";
    } else if (!/^\d{6}$/.test(formData.shippingPostalCode)) {
      errors.shippingPostalCode = "Invalid postal code (6 digits)";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      setError("Please fix the errors above");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            selectedColor: item.selectedColor,
            quantity: item.quantity,
          })),
          contactDetails: formData,
          idempotencyKey,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        if (result.validationErrors) {
          setValidationErrors(result.validationErrors);
        }
        throw new Error(result.error || "Failed to create order");
      }

      // Mark order complete BEFORE clearing cart so the empty-cart
      // redirect guard doesn't hijack navigation.
      orderCompleteRef.current = true;
      clearCart();
      router.push(`/account/orders/${result.orderId}`);
    } catch (err) {
      console.error("[Checkout] Order creation failed:", err);
      setError(err instanceof Error ? err.message : "Failed to create order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="flex-1 pt-20 min-h-screen flex items-center justify-center">
          <p className="text-ink/60">Loading checkout...</p>
        </main>
        <Footer />
      </>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Navigation />

      <main className="flex-1 pt-20 min-h-screen">
        <section className="py-12">
          <div className="max-w-6xl mx-auto px-6">
            <h1 className="font-handwritten text-4xl md:text-5xl font-bold text-ink mb-8">
              Checkout
              <span className="relative inline-block ml-2">
                <span className="relative z-10">.</span>
                <span className="absolute inset-0 bg-yellow opacity-60 -rotate-3 rounded" />
              </span>
            </h1>

            <form onSubmit={handleSubmit}>
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Left Column - Forms */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Contact Information */}
                  <div className="bg-white border-2 border-ink/10 rounded-2xl p-6">
                    <h2 className="font-semibold text-xl text-ink mb-4">
                      Contact Information
                    </h2>

                    <div className="space-y-4">
                      <div>
                        <label htmlFor="customerName" className="block text-sm font-medium text-ink mb-2">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                          id="customerName"
                          type="text"
                          value={formData.customerName}
                          onChange={(e) => handleInputChange("customerName", e.target.value)}
                          disabled={submitting}
                          className={validationErrors.customerName ? "border-red-500" : ""}
                        />
                        {validationErrors.customerName && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.customerName}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="customerEmail" className="block text-sm font-medium text-ink mb-2">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <Input
                          id="customerEmail"
                          type="email"
                          value={formData.customerEmail}
                          onChange={(e) => handleInputChange("customerEmail", e.target.value)}
                          disabled={submitting}
                          className={validationErrors.customerEmail ? "border-red-500" : ""}
                        />
                        {validationErrors.customerEmail && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.customerEmail}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="customerPhone" className="block text-sm font-medium text-ink mb-2">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <Input
                          id="customerPhone"
                          type="tel"
                          value={formData.customerPhone}
                          onChange={(e) => handleInputChange("customerPhone", e.target.value)}
                          placeholder="+91 XXXXXXXXXX"
                          disabled={submitting}
                          className={validationErrors.customerPhone ? "border-red-500" : ""}
                        />
                        {validationErrors.customerPhone && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.customerPhone}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div className="bg-white border-2 border-ink/10 rounded-2xl p-6">
                    <h2 className="font-semibold text-xl text-ink mb-4">
                      Shipping Address
                    </h2>

                    <div className="space-y-4">
                      <div>
                        <label htmlFor="shippingAddressLine1" className="block text-sm font-medium text-ink mb-2">
                          Address Line 1 <span className="text-red-500">*</span>
                        </label>
                        <Input
                          id="shippingAddressLine1"
                          type="text"
                          value={formData.shippingAddressLine1}
                          onChange={(e) => handleInputChange("shippingAddressLine1", e.target.value)}
                          disabled={submitting}
                          className={validationErrors.shippingAddressLine1 ? "border-red-500" : ""}
                        />
                        {validationErrors.shippingAddressLine1 && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.shippingAddressLine1}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="shippingAddressLine2" className="block text-sm font-medium text-ink mb-2">
                          Address Line 2 (Optional)
                        </label>
                        <Input
                          id="shippingAddressLine2"
                          type="text"
                          value={formData.shippingAddressLine2}
                          onChange={(e) => handleInputChange("shippingAddressLine2", e.target.value)}
                          disabled={submitting}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="shippingCity" className="block text-sm font-medium text-ink mb-2">
                            City <span className="text-red-500">*</span>
                          </label>
                          <Input
                            id="shippingCity"
                            type="text"
                            value={formData.shippingCity}
                            onChange={(e) => handleInputChange("shippingCity", e.target.value)}
                            disabled={submitting}
                            className={validationErrors.shippingCity ? "border-red-500" : ""}
                          />
                          {validationErrors.shippingCity && (
                            <p className="text-red-500 text-sm mt-1">{validationErrors.shippingCity}</p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="shippingState" className="block text-sm font-medium text-ink mb-2">
                            State <span className="text-red-500">*</span>
                          </label>
                          <Input
                            id="shippingState"
                            type="text"
                            value={formData.shippingState}
                            onChange={(e) => handleInputChange("shippingState", e.target.value)}
                            disabled={submitting}
                            className={validationErrors.shippingState ? "border-red-500" : ""}
                          />
                          {validationErrors.shippingState && (
                            <p className="text-red-500 text-sm mt-1">{validationErrors.shippingState}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="shippingPostalCode" className="block text-sm font-medium text-ink mb-2">
                            Postal Code <span className="text-red-500">*</span>
                          </label>
                          <Input
                            id="shippingPostalCode"
                            type="text"
                            value={formData.shippingPostalCode}
                            onChange={(e) => handleInputChange("shippingPostalCode", e.target.value)}
                            placeholder="XXXXXX"
                            disabled={submitting}
                            className={validationErrors.shippingPostalCode ? "border-red-500" : ""}
                          />
                          {validationErrors.shippingPostalCode && (
                            <p className="text-red-500 text-sm mt-1">{validationErrors.shippingPostalCode}</p>
                          )}
                        </div>

                        <div>
                          <label htmlFor="shippingCountry" className="block text-sm font-medium text-ink mb-2">
                            Country
                          </label>
                          <Input
                            id="shippingCountry"
                            type="text"
                            value="India"
                            disabled
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Special Instructions */}
                  <div className="bg-white border-2 border-ink/10 rounded-2xl p-6">
                    <h2 className="font-semibold text-xl text-ink mb-4">
                      Special Instructions (Optional)
                    </h2>

                    <textarea
                      value={formData.specialInstructions}
                      onChange={(e) => handleInputChange("specialInstructions", e.target.value)}
                      placeholder="Any special requests or delivery instructions..."
                      rows={4}
                      disabled={submitting}
                      className="w-full px-4 py-3 border-2 border-ink/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime focus:border-transparent resize-none"
                    />
                  </div>
                </div>

                {/* Right Column - Order Summary */}
                <div className="lg:col-span-1">
                  <div className="bg-white border-2 border-ink/10 rounded-2xl p-6 sticky top-24">
                    <h2 className="font-semibold text-xl text-ink mb-4">
                      Order Summary
                    </h2>

                    <div className="space-y-3 mb-6">
                      {cart.items.map((item) => (
                        <div key={item.id} className="text-sm">
                          <div className="flex justify-between font-medium">
                            <span className="text-ink">{item.productName}</span>
                            <span className="text-ink">{formatPrice(item.unitPricePaise * item.quantity)}</span>
                          </div>
                          <div className="text-ink/60 text-xs">
                            {item.sizeName} • {item.selectedColor} • Qty: {item.quantity}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3 mb-6 pt-3 border-t-2 border-ink/10">
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

                    {error && (
                      <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-800 text-sm mb-4">
                        {error}
                      </div>
                    )}

                    <Button
                      type="submit"
                      variant="accent"
                      size="lg"
                      className="w-full rounded-full"
                      disabled={submitting}
                    >
                      {submitting ? "Placing Order..." : "Place Order"}
                    </Button>

                    <p className="text-xs text-center text-ink/60 mt-4">
                      Payment will be collected separately after order confirmation
                    </p>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
