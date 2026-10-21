"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { updateMaterialRate } from "./actions";

interface MaterialRate {
  id: string;
  material: string;
  ratePaisePerGram: number;
  isActive: boolean;
}

export default function PricingSettingsPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rates, setRates] = useState<MaterialRate[]>([]);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login?redirect=/admin/settings/pricing");
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

      // Load material rates
      const { data: materialRates, error: ratesError } = await supabase
        .from("material_pricing_settings")
        .select("*")
        .order("material");

      if (ratesError) {
        setError(`Failed to load pricing settings: ${ratesError.message}`);
      } else if (materialRates) {
        setRates(materialRates.map((r: { id: string; material: string; rate_paise_per_gram: number; is_active: boolean }) => ({
          id: r.id,
          material: r.material,
          ratePaisePerGram: r.rate_paise_per_gram,
          isActive: r.is_active
        })));
      }

      setLoading(false);
    }

    init();
  }, [router]);

  function formatRupees(paise: number): string {
    return (paise / 100).toFixed(2);
  }

  function parseRupees(rupees: string): number {
    return Math.round(parseFloat(rupees || "0") * 100);
  }

  async function handleSave(materialId: string, newRatePaise: number) {
    setError(null);
    setSuccess(null);
    setSaving(true);

    const result = await updateMaterialRate(materialId, newRatePaise);

    if (result.success) {
      setSuccess("Material rate updated successfully");
      setRates(rates.map(r =>
        r.id === materialId
          ? { ...r, ratePaisePerGram: newRatePaise }
          : r
      ));
    } else {
      setError(result.error || "Failed to update rate");
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="flex-1 pt-20 min-h-screen flex items-center justify-center">
          <p className="text-ink/60">Loading...</p>
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
              ← Back to Admin
            </Link>

            <h1 className="font-handwritten text-4xl md:text-5xl font-bold text-ink mt-4 mb-2">
              Material Pricing
              <span className="relative inline-block ml-2">
                <span className="relative z-10">.</span>
                <span className="absolute inset-0 bg-yellow opacity-60 -rotate-3 rounded" />
              </span>
            </h1>

            <p className="text-ink/60 mb-8">
              Manage per-gram pricing rates for different 3D printing materials.
              Product prices are automatically calculated based on production weight × material rate.
            </p>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-lime/20 border-2 border-lime rounded-xl p-4 mb-6">
                <p className="text-ink">{success}</p>
              </div>
            )}

            <div className="bg-white border-2 border-ink/10 rounded-2xl p-6">
              <h2 className="font-semibold text-xl text-ink mb-4">Material Rates</h2>

              <div className="space-y-4">
                {rates.map((rate) => (
                  <div key={rate.id} className="border-2 border-ink/10 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg text-ink">{rate.material}</h3>
                        <p className="text-sm text-ink/60">
                          Current rate: ₹{formatRupees(rate.ratePaisePerGram)} per gram
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        rate.isActive
                          ? 'bg-lime text-ink'
                          : 'bg-ink/10 text-ink/60'
                      }`}>
                        {rate.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-ink mb-2">
                          Rate (₹ per gram)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formatRupees(rate.ratePaisePerGram)}
                          onChange={(e) => {
                            const newRatePaise = parseRupees(e.target.value);
                            setRates(rates.map(r =>
                              r.id === rate.id
                                ? { ...r, ratePaisePerGram: newRatePaise }
                                : r
                            ));
                          }}
                          className="w-full px-4 py-3 border-2 border-ink/20 rounded-xl focus:border-lime focus:ring-2 focus:ring-lime/20 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-end">
                        <Button
                          variant="accent"
                          size="md"
                          onClick={() => handleSave(rate.id, rate.ratePaisePerGram)}
                          disabled={saving}
                          className="w-full"
                        >
                          {saving ? "Saving..." : "Update Rate"}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-cream/50 rounded-lg">
                      <p className="text-sm text-ink/70">
                        <strong>Examples:</strong>
                      </p>
                      <ul className="text-sm text-ink/70 mt-2 space-y-1">
                        <li>• 50g product = ₹{(50 * rate.ratePaisePerGram / 100).toFixed(2)}</li>
                        <li>• 100g product = ₹{(100 * rate.ratePaisePerGram / 100).toFixed(2)}</li>
                        <li>• 200g product = ₹{(200 * rate.ratePaisePerGram / 100).toFixed(2)}</li>
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-yellow/20 border-2 border-yellow/40 rounded-xl">
                <p className="text-sm text-ink/80">
                  <strong>⚠️ Important:</strong> Changing rates will affect new product prices immediately.
                  Existing orders retain their original prices and are not affected.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
