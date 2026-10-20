"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { submitContactMessage, type ContactFormData } from "./actions";
import { createClient } from "@/lib/supabase/client";

const enquiryTypes = [
  { value: "custom_3d_printing", label: "Custom 3D Printing" },
  { value: "product_enquiry", label: "Product Enquiry" },
  { value: "cad_design", label: "CAD Design and Prototyping" },
  { value: "existing_order", label: "Existing Order" },
  { value: "quotation_request", label: "Quotation Request" },
  { value: "other", label: "Other" },
] as const;

export default function ContactPage() {
  const [formData, setFormData] = useState<ContactFormData>({
    fullName: "",
    email: "",
    enquiryType: "product_enquiry",
    subject: "",
    message: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Pre-fill email if user is authenticated
  useEffect(() => {
    async function loadUserData() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setFormData((prev) => ({
          ...prev,
          email: user.email || "",
        }));

        // Try to get display name
        const { data: profile } = await supabase
          .from("customer_profiles")
          .select("display_name")
          .eq("id", user.id)
          .single();

        if (profile?.display_name) {
          setFormData((prev) => ({
            ...prev,
            fullName: profile.display_name,
          }));
        }
      }
    }

    loadUserData();
  }, []);

  function handleInputChange(field: keyof ContactFormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
    if (error) setError(null);
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    if (!formData.fullName.trim() || formData.fullName.length < 2) {
      errors.fullName = "Please enter your full name (at least 2 characters)";
    }

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (!formData.message.trim() || formData.message.length < 10) {
      errors.message = "Please enter a message (at least 10 characters)";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await submitContactMessage(formData);

      if (result.success) {
        setSubmitted(true);
        setFormData({
          fullName: "",
          email: "",
          enquiryType: "product_enquiry",
          subject: "",
          message: "",
        });
      } else {
        setError(result.error || "Failed to submit message. Please try again.");
      }
    } catch (err) {
      console.error("Form submission error:", err);
      setError("An unexpected error occurred. Please try again or contact us at hello@mivo.in");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <>
        <Navigation />
        <main className="flex-1 pt-20">
          <section className="py-20 min-h-[80vh] flex items-center justify-center bg-gradient-to-br from-cream via-cream to-lime/5">
            <div className="max-w-2xl mx-auto px-6 text-center">
              <div className="w-20 h-20 bg-lime rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-10 h-10 text-ink"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <h1 className="font-handwritten text-4xl md:text-6xl font-bold text-ink mb-4">
                Message sent!
              </h1>
              <p className="text-lg text-ink/70 mb-8">
                We've received your message and will get back to you within 24-48 hours.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  variant="accent"
                  size="lg"
                  onClick={() => {
                    setSubmitted(false);
                    setError(null);
                  }}
                >
                  Send Another Message
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => (window.location.href = "/")}
                >
                  Back to Home
                </Button>
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

      <main className="flex-1 pt-20">
        {/* Hero Section */}
        <section className="relative py-16 bg-gradient-to-br from-cream via-cream to-lime/5 overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-lime/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-yellow/5 rounded-full blur-3xl" />

          <div className="max-w-4xl mx-auto px-6 relative text-center">
            <h1 className="font-handwritten text-5xl md:text-7xl font-bold text-ink mb-6 leading-tight">
              Let's make something real
              <span className="relative inline-block ml-2">
                <span className="relative z-10">.</span>
                <span className="absolute inset-0 bg-yellow opacity-60 -rotate-3 rounded" />
              </span>
            </h1>

            <p className="text-xl text-ink/80 max-w-2xl mx-auto">
              Have questions about products? Want to discuss a custom 3D printing project? Need help with an order? We're here to help.
            </p>
          </div>
        </section>

        {/* Contact Form Section */}
        <section className="py-20 bg-white">
          <div className="max-w-3xl mx-auto px-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Alert */}
              {error && (
                <div className="bg-orange/10 border-2 border-orange rounded-xl p-4 flex gap-3">
                  <svg
                    className="w-5 h-5 text-orange flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-ink font-medium">{error}</p>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block font-semibold text-ink mb-2">
                  Full Name <span className="text-orange">*</span>
                </label>
                <Input
                  id="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange("fullName", e.target.value)}
                  placeholder="Your full name"
                  disabled={submitting}
                  className={validationErrors.fullName ? "border-orange" : ""}
                />
                {validationErrors.fullName && (
                  <p className="text-orange text-sm mt-1">{validationErrors.fullName}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block font-semibold text-ink mb-2">
                  Email Address <span className="text-orange">*</span>
                </label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="your.email@example.com"
                  disabled={submitting}
                  className={validationErrors.email ? "border-orange" : ""}
                />
                {validationErrors.email && (
                  <p className="text-orange text-sm mt-1">{validationErrors.email}</p>
                )}
              </div>

              {/* Enquiry Type */}
              <div>
                <label htmlFor="enquiryType" className="block font-semibold text-ink mb-2">
                  What can we help you with? <span className="text-orange">*</span>
                </label>
                <select
                  id="enquiryType"
                  value={formData.enquiryType}
                  onChange={(e) => handleInputChange("enquiryType", e.target.value)}
                  disabled={submitting}
                  className="w-full px-4 py-3 border-2 border-ink/20 rounded-lg bg-white text-ink font-medium focus:border-lime focus:ring-2 focus:ring-lime/20 focus:outline-none transition-all"
                >
                  {enquiryTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject (Optional) */}
              <div>
                <label htmlFor="subject" className="block font-semibold text-ink mb-2">
                  Subject <span className="text-ink/50 text-sm font-normal">(optional)</span>
                </label>
                <Input
                  id="subject"
                  type="text"
                  value={formData.subject}
                  onChange={(e) => handleInputChange("subject", e.target.value)}
                  placeholder="Brief summary of your enquiry"
                  disabled={submitting}
                />
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="block font-semibold text-ink mb-2">
                  Message <span className="text-orange">*</span>
                </label>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => handleInputChange("message", e.target.value)}
                  placeholder="Tell us more about your project or question..."
                  disabled={submitting}
                  rows={6}
                  className={`w-full px-4 py-3 border-2 rounded-lg bg-white text-ink resize-y focus:ring-2 focus:ring-lime/20 focus:outline-none transition-all ${
                    validationErrors.message
                      ? "border-orange focus:border-orange"
                      : "border-ink/20 focus:border-lime"
                  }`}
                />
                {validationErrors.message && (
                  <p className="text-orange text-sm mt-1">{validationErrors.message}</p>
                )}
                <p className="text-ink/50 text-sm mt-1">
                  {formData.message.length} / 2000 characters
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  variant="accent"
                  size="lg"
                  disabled={submitting}
                  className="w-full sm:w-auto"
                >
                  {submitting ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Message
                      <svg
                        className="w-5 h-5 ml-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14 5l7 7m0 0l-7 7m7-7H3"
                        />
                      </svg>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </section>

        {/* Alternative Contact */}
        <section className="py-16 bg-cream">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="font-handwritten text-3xl md:text-5xl font-bold text-ink mb-4">
                Other ways to reach us
              </h2>
              <p className="text-ink/70">
                Prefer to contact us directly? Use these details
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Email */}
              <div className="bg-white border-2 border-ink/10 rounded-2xl p-8 hover:border-lime transition-all">
                <div className="w-12 h-12 bg-lime/20 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-ink"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="font-bold text-xl text-ink mb-2">Email</h3>
                <a
                  href="mailto:hello@mivo.in"
                  className="text-lime hover:text-ink transition-colors font-medium"
                >
                  hello@mivo.in
                </a>
                <p className="text-ink/60 text-sm mt-2">
                  We typically respond within 24-48 hours
                </p>
              </div>

              {/* Phone */}
              <div className="bg-white border-2 border-ink/10 rounded-2xl p-8 hover:border-lime transition-all">
                <div className="w-12 h-12 bg-lime/20 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-ink"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                </div>
                <h3 className="font-bold text-xl text-ink mb-2">Phone</h3>
                <a
                  href="tel:+919876543210"
                  className="text-lime hover:text-ink transition-colors font-medium"
                >
                  +91 98765 43210
                </a>
                <p className="text-ink/60 text-sm mt-2">
                  Available Monday - Saturday, 10 AM - 6 PM IST
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
