"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { getShippingSettings, updateShippingSettings, type ShippingSettings } from "../actions";

export default function ShippingSettingsPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [settings, setSettings] = useState<ShippingSettings | null>(null);
  const [flatRate, setFlatRate] = useState(100); // in rupees
  const [enableFreeShipping, setEnableFreeShipping] = useState(false);
  const [freeThreshold, setFreeThreshold] = useState(1000); // in rupees

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login?redirect=/admin/settings/shipping");
        return;
      }

      const { data: profile } = await supabase
        .from("customer_profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!profile?.is_admin) {
        router.push("/");
        return;
      }

      setIsAdmin(true);

      // Load settings
      const currentSettings = await getShippingSettings();
      if (currentSettings) {
        setSettings(currentSettings);
        setFlatRate(currentSettings.flatRatePaise / 100);
        setEnableFreeShipping(currentSettings.freeShippingThresholdPaise !== null);
        setFreeThreshold((currentSettings.freeShippingThresholdPaise || 100000) / 100);
      }

      setLoading(false);
    }

    init();
  }, [router]);

  async function handleSubmit() {
    setError(null);
    setSuccess(false);
    setSaving(true);

    const flatRatePaise = Math.round(flatRate * 100);
    const freeThresholdPaise = enableFreeShipping ? Math.round(freeThreshold * 100) : null;

    const result = await updateShippingSettings(flatRatePaise, freeThresholdPaise);

    if (!result.success) {
      setError(result.error || "Failed to update settings");
      setSaving(false);
      return;
    }

    setSuccess(true);
    setSaving(false);

    // Reload settings
    const updated = await getShippingSettings();
    if (updated) {
      setSettings(updated);
    }
  }

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="flex-1 pt-20 min-h-screen flex items-center justify-center">
          <p className="text-ink/60">Loading settings...</p>
        </main>
        <Footer />
      </>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Navigation />
      <main className="flex-1 pt-20 min-h-screen">
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-6">
            <Link
              href="/admin"
              className="text-sm text-ink/60 hover:text-lime transition-colors mb-4 inline-flex items-center gap-1"
            >
              ← Back to Dashboard
            </Link>

            <h1 className="font-handwritten text-4xl md:text-5xl font-bold text-ink mt-4 mb-8">
              Shipping Settings
              <span className="relative inline-block ml-2">
                <span className="relative z-10">.</span>
                <span className="absolute inset-0 bg-yellow opacity-60 -rotate-3 rounded" />
              </span>
            </h1>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6">
                <p className="text-green-800">Settings updated successfully!</p>
              </div>
            )}

            <div className="bg-white border-2 border-ink/10 rounded-2xl p-6 mb-6">
              <h2 className="font-semibold text-xl text-ink mb-4">Flat Rate Shipping</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-2">
                    Shipping Rate (₹) *
                  </label>
                  <input
                    type="number"
                    value={flatRate}
                    onChange={(e) => setFlatRate(parseFloat(e.target.value) || 0)}
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-3 border-2 border-ink/20 rounded-xl focus:border-lime focus:ring-2 focus:ring-lime/20 focus:outline-none"
                  />
                  <p className="text-xs text-ink/50 mt-1">
                    This flat rate will be applied to all orders
                  </p>
                </div>

                <div className="border-t-2 border-ink/10 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableFreeShipping}
                      onChange={(e) => setEnableFreeShipping(e.target.checked)}
                      className="w-5 h-5 border-2 border-ink/20 rounded focus:ring-2 focus:ring-lime/20"
                    />
                    <span className="text-sm font-medium text-ink">
                      Enable free shipping threshold
                    </span>
                  </label>

                  {enableFreeShipping && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-ink mb-2">
                        Free Shipping Above (₹) *
                      </label>
                      <input
                        type="number"
                        value={freeThreshold}
                        onChange={(e) => setFreeThreshold(parseFloat(e.target.value) || 0)}
                        step="0.01"
                        min="0"
                        className="w-full px-4 py-3 border-2 border-ink/20 rounded-xl focus:border-lime focus:ring-2 focus:ring-lime/20 focus:outline-none"
                      />
                      <p className="text-xs text-ink/50 mt-1">
                        Orders above this amount will have free shipping
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {settings && (
              <div className="bg-cream/50 border-2 border-ink/10 rounded-xl p-4 mb-6">
                <p className="text-sm text-ink/60">
                  Current settings: ₹{(settings.flatRatePaise / 100).toFixed(2)} flat rate
                  {settings.freeShippingThresholdPaise && (
                    <>, free above ₹{(settings.freeShippingThresholdPaise / 100).toFixed(2)}</>
                  )}
                </p>
                <p className="text-xs text-ink/50 mt-1">
                  Last updated: {new Date(settings.updatedAt).toLocaleString("en-IN")}
                </p>
              </div>
            )}

            <div className="flex gap-4">
              <Button
                variant="accent"
                size="lg"
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1"
              >
                {saving ? "Saving..." : "Save Settings"}
              </Button>
              <Link href="/admin">
                <Button variant="secondary" size="lg">
                  Cancel
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
