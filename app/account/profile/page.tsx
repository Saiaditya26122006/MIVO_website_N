"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [gstNumber, setGstNumber] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: profile } = await supabase
        .from("customer_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setDisplayName(profile.display_name || "");
        setPhone(profile.phone || "");
        setAddressLine1(profile.address_line1 || "");
        setAddressLine2(profile.address_line2 || "");
        setCity(profile.city || "");
        setState(profile.state || "");
        setPostalCode(profile.postal_code || "");
        setCompanyName(profile.company_name || "");
        setGstNumber(profile.gst_number || "");
      }

      setLoading(false);
    }

    loadProfile();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Not authenticated");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("customer_profiles")
      .upsert({
        id: user.id,
        display_name: displayName,
        phone: phone || null,
        address_line1: addressLine1 || null,
        address_line2: addressLine2 || null,
        city: city || null,
        state: state || null,
        postal_code: postalCode || null,
        company_name: companyName || null,
        gst_number: gstNumber || null,
      });

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setSuccess(true);
    setSaving(false);

    // Redirect after success
    setTimeout(() => {
      router.push("/account");
    }, 1500);
  }

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="flex-1 pt-20 min-h-screen flex items-center justify-center">
          <p className="text-ink/60">Loading profile...</p>
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
          <div className="max-w-2xl mx-auto px-6">
            <div className="mb-8">
              <h1 className="font-handwritten text-4xl md:text-5xl font-bold text-ink mb-2">
                Edit Profile
                <span className="relative inline-block ml-2">
                  <span className="relative z-10">.</span>
                  <span className="absolute inset-0 bg-yellow opacity-60 -rotate-3 rounded" />
                </span>
              </h1>
              <p className="text-ink/70">Update your account information</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white border-2 border-ink/10 rounded-2xl p-8">
              {error && (
                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-800 text-sm mb-6">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-4 bg-lime/10 border-2 border-lime/20 rounded-xl text-ink text-sm mb-6">
                  Profile updated successfully! Redirecting...
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-ink mb-4">Personal Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="displayName" className="block text-sm font-medium text-ink mb-2">
                        Full Name
                      </label>
                      <Input
                        id="displayName"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        disabled={saving}
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-ink mb-2">
                        Phone Number
                      </label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={saving}
                        placeholder="+91 XXXXXXXXXX"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-ink mb-4">Address</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="addressLine1" className="block text-sm font-medium text-ink mb-2">
                        Address Line 1
                      </label>
                      <Input
                        id="addressLine1"
                        type="text"
                        value={addressLine1}
                        onChange={(e) => setAddressLine1(e.target.value)}
                        disabled={saving}
                      />
                    </div>

                    <div>
                      <label htmlFor="addressLine2" className="block text-sm font-medium text-ink mb-2">
                        Address Line 2 (Optional)
                      </label>
                      <Input
                        id="addressLine2"
                        type="text"
                        value={addressLine2}
                        onChange={(e) => setAddressLine2(e.target.value)}
                        disabled={saving}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="city" className="block text-sm font-medium text-ink mb-2">
                          City
                        </label>
                        <Input
                          id="city"
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          disabled={saving}
                        />
                      </div>

                      <div>
                        <label htmlFor="state" className="block text-sm font-medium text-ink mb-2">
                          State
                        </label>
                        <Input
                          id="state"
                          type="text"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          disabled={saving}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="postalCode" className="block text-sm font-medium text-ink mb-2">
                        Postal Code
                      </label>
                      <Input
                        id="postalCode"
                        type="text"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        disabled={saving}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-ink mb-4">Business Details (Optional)</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="companyName" className="block text-sm font-medium text-ink mb-2">
                        Company Name
                      </label>
                      <Input
                        id="companyName"
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        disabled={saving}
                      />
                    </div>

                    <div>
                      <label htmlFor="gstNumber" className="block text-sm font-medium text-ink mb-2">
                        GST Number
                      </label>
                      <Input
                        id="gstNumber"
                        type="text"
                        value={gstNumber}
                        onChange={(e) => setGstNumber(e.target.value)}
                        disabled={saving}
                        placeholder="22AAAAA0000A1Z5"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <Button type="submit" variant="accent" disabled={saving} className="flex-1">
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push("/account")}
                  disabled={saving}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
