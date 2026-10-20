"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { getCategories } from "@/services/products.service";
import type { Category } from "@/lib/data/types";
import type { CustomQuotationFormData } from "@/lib/data/quotation-types";

export default function CustomQuotationPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<CustomQuotationFormData>({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    projectTitle: "",
    projectDescription: "",
    categoryId: "",
    hasCustomDimensions: false,
    customLengthMm: undefined,
    customWidthMm: undefined,
    customHeightMm: undefined,
    hasCustomDesign: false,
    preferredMaterial: "",
    preferredColor: "",
    quantity: 1,
    budgetMinPaise: undefined,
    budgetMaxPaise: undefined,
    requiredByDate: "",
    additionalNotes: "",
  });

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        router.push("/auth/login?redirect=/custom");
        return;
      }

      setUser({ id: authUser.id, email: authUser.email! });

      // Load profile
      const { data: profile } = await supabase
        .from("customer_profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (profile) {
        setFormData((prev) => ({
          ...prev,
          customerName: profile.display_name || "",
          customerEmail: authUser.email!,
          customerPhone: profile.phone || "",
        }));
      } else {
        setFormData((prev) => ({ ...prev, customerEmail: authUser.email! }));
      }

      // Load categories
      const cats = await getCategories();
      setCategories(cats);

      setLoading(false);
    }

    loadData();
  }, [router]);

  function handleInputChange(field: keyof CustomQuotationFormData, value: unknown) {
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
    }

    if (!formData.customerPhone.trim()) {
      errors.customerPhone = "Phone is required";
    }

    if (!formData.projectTitle.trim()) {
      errors.projectTitle = "Project title is required";
    }

    if (!formData.projectDescription.trim()) {
      errors.projectDescription = "Project description is required";
    }

    if (formData.quantity < 1) {
      errors.quantity = "Quantity must be at least 1";
    }

    if (formData.hasCustomDimensions) {
      if (!formData.customLengthMm || formData.customLengthMm <= 0) {
        errors.customLengthMm = "Length is required";
      }
      if (!formData.customWidthMm || formData.customWidthMm <= 0) {
        errors.customWidthMm = "Width is required";
      }
      if (!formData.customHeightMm || formData.customHeightMm <= 0) {
        errors.customHeightMm = "Height is required";
      }
    }

    if (formData.budgetMinPaise && formData.budgetMaxPaise) {
      if (formData.budgetMaxPaise < formData.budgetMinPaise) {
        errors.budgetMaxPaise = "Max budget must be greater than min budget";
      }
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
      const response = await fetch("/api/quotations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        if (result.validationErrors) {
          setValidationErrors(result.validationErrors);
        }
        throw new Error(result.error || "Failed to submit quotation request");
      }

      router.push(`/account/quotations/${result.quotationId}`);
    } catch (err) {
      console.error("[Quotation] Submission failed:", err);
      setError(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
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

  if (!user) {
    return null;
  }

  return (
    <>
      <Navigation />

      <main className="flex-1 pt-20 min-h-screen">
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-6">
            <div className="mb-8">
              <h1 className="font-handwritten text-4xl md:text-5xl font-bold text-ink mb-4">
                Custom Quotation Request
                <span className="relative inline-block ml-2">
                  <span className="relative z-10">.</span>
                  <span className="absolute inset-0 bg-yellow opacity-60 -rotate-3 rounded" />
                </span>
              </h1>
              <p className="text-ink/70 text-lg">
                Tell us about your custom 3D printing project and we'll provide a detailed quote.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact Information */}
              <div className="bg-white border-2 border-ink/10 rounded-2xl p-6">
                <h2 className="font-semibold text-xl text-ink mb-4">Contact Information</h2>

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

                  <div className="grid grid-cols-2 gap-4">
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
                        Phone <span className="text-red-500">*</span>
                      </label>
                      <Input
                        id="customerPhone"
                        type="tel"
                        value={formData.customerPhone}
                        onChange={(e) => handleInputChange("customerPhone", e.target.value)}
                        disabled={submitting}
                        className={validationErrors.customerPhone ? "border-red-500" : ""}
                      />
                      {validationErrors.customerPhone && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.customerPhone}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Project Details */}
              <div className="bg-white border-2 border-ink/10 rounded-2xl p-6">
                <h2 className="font-semibold text-xl text-ink mb-4">Project Details</h2>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="projectTitle" className="block text-sm font-medium text-ink mb-2">
                      Project Title <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="projectTitle"
                      type="text"
                      value={formData.projectTitle}
                      onChange={(e) => handleInputChange("projectTitle", e.target.value)}
                      placeholder="e.g., Custom Phone Stand for Desk"
                      disabled={submitting}
                      className={validationErrors.projectTitle ? "border-red-500" : ""}
                    />
                    {validationErrors.projectTitle && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.projectTitle}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="projectDescription" className="block text-sm font-medium text-ink mb-2">
                      Project Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="projectDescription"
                      value={formData.projectDescription}
                      onChange={(e) => handleInputChange("projectDescription", e.target.value)}
                      placeholder="Describe what you need printed, its intended use, and any specific requirements..."
                      rows={5}
                      disabled={submitting}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime focus:border-transparent resize-none ${
                        validationErrors.projectDescription ? "border-red-500" : "border-ink/20"
                      }`}
                    />
                    {validationErrors.projectDescription && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.projectDescription}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="categoryId" className="block text-sm font-medium text-ink mb-2">
                      Related Category (Optional)
                    </label>
                    <select
                      id="categoryId"
                      value={formData.categoryId}
                      onChange={(e) => handleInputChange("categoryId", e.target.value)}
                      disabled={submitting}
                      className="w-full px-4 py-3 border-2 border-ink/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime focus:border-transparent"
                    >
                      <option value="">Select a category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="quantity" className="block text-sm font-medium text-ink mb-2">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => handleInputChange("quantity", parseInt(e.target.value) || 1)}
                      disabled={submitting}
                      className={validationErrors.quantity ? "border-red-500" : ""}
                    />
                    {validationErrors.quantity && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.quantity}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Custom Dimensions */}
              <div className="bg-white border-2 border-ink/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="hasCustomDimensions"
                    checked={formData.hasCustomDimensions}
                    onChange={(e) => handleInputChange("hasCustomDimensions", e.target.checked)}
                    disabled={submitting}
                    className="w-5 h-5 rounded border-2 border-ink/20"
                  />
                  <label htmlFor="hasCustomDimensions" className="font-semibold text-xl text-ink cursor-pointer">
                    I need custom dimensions
                  </label>
                </div>

                {formData.hasCustomDimensions && (
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <label htmlFor="customLengthMm" className="block text-sm font-medium text-ink mb-2">
                        Length (mm) <span className="text-red-500">*</span>
                      </label>
                      <Input
                        id="customLengthMm"
                        type="number"
                        min="1"
                        value={formData.customLengthMm || ""}
                        onChange={(e) => handleInputChange("customLengthMm", parseInt(e.target.value) || undefined)}
                        disabled={submitting}
                        className={validationErrors.customLengthMm ? "border-red-500" : ""}
                      />
                      {validationErrors.customLengthMm && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.customLengthMm}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="customWidthMm" className="block text-sm font-medium text-ink mb-2">
                        Width (mm) <span className="text-red-500">*</span>
                      </label>
                      <Input
                        id="customWidthMm"
                        type="number"
                        min="1"
                        value={formData.customWidthMm || ""}
                        onChange={(e) => handleInputChange("customWidthMm", parseInt(e.target.value) || undefined)}
                        disabled={submitting}
                        className={validationErrors.customWidthMm ? "border-red-500" : ""}
                      />
                      {validationErrors.customWidthMm && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.customWidthMm}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="customHeightMm" className="block text-sm font-medium text-ink mb-2">
                        Height (mm) <span className="text-red-500">*</span>
                      </label>
                      <Input
                        id="customHeightMm"
                        type="number"
                        min="1"
                        value={formData.customHeightMm || ""}
                        onChange={(e) => handleInputChange("customHeightMm", parseInt(e.target.value) || undefined)}
                        disabled={submitting}
                        className={validationErrors.customHeightMm ? "border-red-500" : ""}
                      />
                      {validationErrors.customHeightMm && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.customHeightMm}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Design Upload Placeholder */}
              <div className="bg-white border-2 border-ink/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="hasCustomDesign"
                    checked={formData.hasCustomDesign}
                    onChange={(e) => handleInputChange("hasCustomDesign", e.target.checked)}
                    disabled={submitting}
                    className="w-5 h-5 rounded border-2 border-ink/20"
                  />
                  <label htmlFor="hasCustomDesign" className="font-semibold text-xl text-ink cursor-pointer">
                    I have my own design files
                  </label>
                </div>

                {formData.hasCustomDesign && (
                  <div className="mt-4 p-4 bg-yellow/10 border-2 border-yellow/30 rounded-xl">
                    <p className="text-sm text-ink/70">
                      Design file upload will be enabled after Supabase Storage is configured. For now, please mention your design files in the additional notes and we'll contact you for file transfer.
                    </p>
                  </div>
                )}
              </div>

              {/* Preferences */}
              <div className="bg-white border-2 border-ink/10 rounded-2xl p-6">
                <h2 className="font-semibold text-xl text-ink mb-4">Preferences</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="preferredMaterial" className="block text-sm font-medium text-ink mb-2">
                      Preferred Material
                    </label>
                    <Input
                      id="preferredMaterial"
                      type="text"
                      value={formData.preferredMaterial}
                      onChange={(e) => handleInputChange("preferredMaterial", e.target.value)}
                      placeholder="e.g., PLA, ABS, PETG"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label htmlFor="preferredColor" className="block text-sm font-medium text-ink mb-2">
                      Preferred Color
                    </label>
                    <Input
                      id="preferredColor"
                      type="text"
                      value={formData.preferredColor}
                      onChange={(e) => handleInputChange("preferredColor", e.target.value)}
                      placeholder="e.g., Black, White"
                      disabled={submitting}
                    />
                  </div>
                </div>
              </div>

              {/* Budget and Timeline */}
              <div className="bg-white border-2 border-ink/10 rounded-2xl p-6">
                <h2 className="font-semibold text-xl text-ink mb-4">Budget & Timeline</h2>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="budgetMin" className="block text-sm font-medium text-ink mb-2">
                        Min Budget (₹)
                      </label>
                      <Input
                        id="budgetMin"
                        type="number"
                        min="0"
                        step="100"
                        value={formData.budgetMinPaise ? formData.budgetMinPaise / 100 : ""}
                        onChange={(e) =>
                          handleInputChange("budgetMinPaise", e.target.value ? parseFloat(e.target.value) * 100 : undefined)
                        }
                        placeholder="Optional"
                        disabled={submitting}
                        className={validationErrors.budgetMinPaise ? "border-red-500" : ""}
                      />
                    </div>

                    <div>
                      <label htmlFor="budgetMax" className="block text-sm font-medium text-ink mb-2">
                        Max Budget (₹)
                      </label>
                      <Input
                        id="budgetMax"
                        type="number"
                        min="0"
                        step="100"
                        value={formData.budgetMaxPaise ? formData.budgetMaxPaise / 100 : ""}
                        onChange={(e) =>
                          handleInputChange("budgetMaxPaise", e.target.value ? parseFloat(e.target.value) * 100 : undefined)
                        }
                        placeholder="Optional"
                        disabled={submitting}
                        className={validationErrors.budgetMaxPaise ? "border-red-500" : ""}
                      />
                      {validationErrors.budgetMaxPaise && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.budgetMaxPaise}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="requiredByDate" className="block text-sm font-medium text-ink mb-2">
                      Required By Date
                    </label>
                    <Input
                      id="requiredByDate"
                      type="date"
                      value={formData.requiredByDate}
                      onChange={(e) => handleInputChange("requiredByDate", e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </div>
              </div>

              {/* Additional Notes */}
              <div className="bg-white border-2 border-ink/10 rounded-2xl p-6">
                <h2 className="font-semibold text-xl text-ink mb-4">Additional Notes</h2>

                <textarea
                  value={formData.additionalNotes}
                  onChange={(e) => handleInputChange("additionalNotes", e.target.value)}
                  placeholder="Any other details or requirements..."
                  rows={4}
                  disabled={submitting}
                  className="w-full px-4 py-3 border-2 border-ink/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-lime focus:border-transparent resize-none"
                />
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-800 text-sm">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button
                  type="submit"
                  variant="accent"
                  size="lg"
                  className="flex-1 rounded-full"
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Submit Quotation Request"}
                </Button>
              </div>

              <p className="text-xs text-center text-ink/60">
                Our team will review your request and provide a detailed quote within 24-48 hours.
              </p>
            </form>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
