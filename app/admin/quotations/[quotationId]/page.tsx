"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { updateQuotationStatus, createOrUpdateQuote, type QuotationStatus } from "../actions";

interface QuotationData {
  id: string;
  quoteReference: string;
  status: string;
  projectTitle: string;
  projectDescription: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  quantity: number;
  hasCustomDimensions: boolean;
  customLengthMm: number | null;
  customWidthMm: number | null;
  customHeightMm: number | null;
  preferredMaterial: string | null;
  preferredColor: string | null;
  budgetMinPaise: number | null;
  budgetMaxPaise: number | null;
  requiredByDate: string | null;
  additionalNotes: string | null;
  createdAt: string;
}

interface QuoteData {
  id: string;
  itemDescription: string;
  quantityQuoted: number;
  unitPricePaise: number;
  subtotalPaise: number;
  shippingPaise: number;
  totalPricePaise: number;
  estimatedProductionDays: number;
  validUntilDate: string;
  internalNotes: string | null;
  customerFacingNotes: string | null;
}

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "pending_review":
      return { label: "Pending Review", className: "bg-yellow-100 text-yellow-800 border-yellow-300" };
    case "under_review":
      return { label: "Under Review", className: "bg-blue-100 text-blue-800 border-blue-300" };
    case "quote_provided":
      return { label: "Quote Provided", className: "bg-lime/20 text-ink border-lime" };
    case "quote_accepted":
      return { label: "Accepted", className: "bg-green-100 text-green-800 border-green-300" };
    case "quote_rejected":
      return { label: "Rejected", className: "bg-red-100 text-red-800 border-red-300" };
    case "order_created":
      return { label: "Order Created", className: "bg-purple-100 text-purple-800 border-purple-300" };
    case "cancelled":
      return { label: "Cancelled", className: "bg-gray-100 text-gray-800 border-gray-300" };
    default:
      return { label: status, className: "bg-gray-100 text-gray-800 border-gray-300" };
  }
}

export default function AdminQuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quotationId = params.quotationId as string;

  const [quotation, setQuotation] = useState<QuotationData | null>(null);
  const [existingQuote, setExistingQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [savingQuote, setSavingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // Quote form state
  const [quoteForm, setQuoteForm] = useState({
    itemDescription: "",
    quantityQuoted: 1,
    unitPrice: 0, // in rupees
    shipping: 100, // in rupees
    productionDays: 2,
    validUntilDays: 7,
    internalNotes: "",
    customerNotes: "",
  });

  useEffect(() => {
    async function loadQuotation() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login?redirect=/admin/quotations");
        return;
      }

      // Check admin status
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

      // Load quotation
      const { data, error } = await supabase
        .from("quotation_requests")
        .select("*")
        .eq("id", quotationId)
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setQuotation({
        id: data.id,
        quoteReference: data.quote_reference,
        status: data.status,
        projectTitle: data.project_title,
        projectDescription: data.project_description,
        customerName: data.customer_name,
        customerEmail: data.customer_email,
        customerPhone: data.customer_phone,
        quantity: data.quantity,
        hasCustomDimensions: data.has_custom_dimensions,
        customLengthMm: data.custom_length_mm,
        customWidthMm: data.custom_width_mm,
        customHeightMm: data.custom_height_mm,
        preferredMaterial: data.preferred_material,
        preferredColor: data.preferred_color,
        budgetMinPaise: data.budget_min_paise,
        budgetMaxPaise: data.budget_max_paise,
        requiredByDate: data.required_by_date,
        additionalNotes: data.additional_notes,
        createdAt: data.created_at,
      });

      // Load existing quote if any
      const { data: quoteData } = await supabase
        .from("quotation_quotes")
        .select("*")
        .eq("quotation_id", quotationId)
        .single();

      if (quoteData) {
        setExistingQuote({
          id: quoteData.id,
          itemDescription: quoteData.item_description,
          quantityQuoted: quoteData.quantity_quoted,
          unitPricePaise: quoteData.unit_price_paise,
          subtotalPaise: quoteData.subtotal_paise,
          shippingPaise: quoteData.shipping_paise,
          totalPricePaise: quoteData.total_price_paise,
          estimatedProductionDays: quoteData.estimated_production_days,
          validUntilDate: quoteData.valid_until_date,
          internalNotes: quoteData.internal_notes,
          customerFacingNotes: quoteData.customer_facing_notes,
        });

        // Prefill form with existing quote
        setQuoteForm({
          itemDescription: quoteData.item_description,
          quantityQuoted: quoteData.quantity_quoted,
          unitPrice: quoteData.unit_price_paise / 100,
          shipping: quoteData.shipping_paise / 100,
          productionDays: quoteData.estimated_production_days,
          validUntilDays: 7,
          internalNotes: quoteData.internal_notes || "",
          customerNotes: quoteData.customer_facing_notes || "",
        });
      } else {
        // Pre-fill with customer's requested quantity
        setQuoteForm((f) => ({ ...f, quantityQuoted: data.quantity }));
      }

      setLoading(false);
    }

    loadQuotation();
  }, [quotationId, router]);

  async function handleUpdateStatus(newStatus: QuotationStatus) {
    if (!quotation || updating) return;

    setUpdating(true);

    const result = await updateQuotationStatus(quotation.id, newStatus);

    if (!result.success) {
      alert(`Failed to update quotation status: ${result.error || "Unknown error"}`);
      setUpdating(false);
      return;
    }

    setQuotation({ ...quotation, status: newStatus });
    setUpdating(false);
  }

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="flex-1 pt-20 min-h-screen flex items-center justify-center">
          <p className="text-ink/60">Loading quotation...</p>
        </main>
        <Footer />
      </>
    );
  }

  if (notFound || !quotation || !isAdmin) {
    return (
      <>
        <Navigation />
        <main className="flex-1 pt-20 min-h-screen">
          <section className="py-16">
            <div className="max-w-4xl mx-auto px-6 text-center">
              <h1 className="font-handwritten text-4xl md:text-5xl font-bold text-ink mb-4">
                Quotation Not Found
              </h1>
              <p className="text-ink/70 mb-8">The quotation you're looking for doesn't exist.</p>
              <Link href="/admin/quotations">
                <Button variant="accent" size="lg" className="rounded-full">
                  Back to Quotations
                </Button>
              </Link>
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  const statusBadge = getStatusBadge(quotation.status);

  return (
    <>
      <Navigation />

      <main className="flex-1 pt-20 min-h-screen">
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-6">
            <Link
              href="/admin/quotations"
              className="text-sm text-ink/60 hover:text-lime transition-colors mb-4 inline-flex items-center gap-1"
            >
              ← Back to Quotations
            </Link>

            <div className="flex items-center justify-between flex-wrap gap-4 mt-4 mb-8">
              <div>
                <h1 className="font-handwritten text-4xl md:text-5xl font-bold text-ink">
                  {quotation.quoteReference}
                </h1>
                <p className="text-ink/60 mt-2">Submitted on {formatDate(quotation.createdAt)}</p>
              </div>

              <div className={`px-4 py-2 rounded-full border-2 font-medium ${statusBadge.className}`}>
                {statusBadge.label}
              </div>
            </div>

            {/* Status Update Actions */}
            <div className="bg-white border-2 border-ink/10 rounded-2xl p-6 mb-6">
              <h2 className="font-semibold text-xl text-ink mb-4">Update Status</h2>

              <div className="flex flex-wrap gap-3">
                {quotation.status === "pending_review" && (
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => handleUpdateStatus("under_review")}
                    disabled={updating}
                  >
                    Start Review
                  </Button>
                )}

                {quotation.status === "under_review" && (
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => handleUpdateStatus("quote_provided")}
                    disabled={updating}
                  >
                    Mark Quote Provided
                  </Button>
                )}

                {quotation.status === "quote_provided" && (
                  <>
                    <Button
                      variant="accent"
                      size="sm"
                      onClick={() => handleUpdateStatus("quote_accepted")}
                      disabled={updating}
                    >
                      Mark as Accepted
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleUpdateStatus("quote_rejected")}
                      disabled={updating}
                    >
                      Mark as Rejected
                    </Button>
                  </>
                )}

                {quotation.status !== "cancelled" && quotation.status !== "order_created" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleUpdateStatus("cancelled")}
                    disabled={updating}
                  >
                    Cancel Request
                  </Button>
                )}
              </div>
            </div>

            {/* Customer Details */}
            <div className="bg-white border-2 border-ink/10 rounded-2xl p-6 mb-6">
              <h2 className="font-semibold text-xl text-ink mb-4">Customer Information</h2>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-ink/60">Name</p>
                  <p className="font-medium text-ink">{quotation.customerName}</p>
                </div>

                <div>
                  <p className="text-sm text-ink/60">Email</p>
                  <p className="font-medium text-ink">{quotation.customerEmail}</p>
                </div>

                <div>
                  <p className="text-sm text-ink/60">Phone</p>
                  <p className="font-medium text-ink">{quotation.customerPhone}</p>
                </div>
              </div>
            </div>

            {/* Project Details */}
            <div className="bg-white border-2 border-ink/10 rounded-2xl p-6 mb-6">
              <h2 className="font-semibold text-xl text-ink mb-4">Project Details</h2>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-ink/60 mb-1">Project Title</p>
                  <p className="font-medium text-ink text-lg">{quotation.projectTitle}</p>
                </div>

                <div>
                  <p className="text-sm text-ink/60 mb-1">Description</p>
                  <p className="text-ink/80 whitespace-pre-line">{quotation.projectDescription}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-ink/60 mb-1">Quantity</p>
                    <p className="font-medium text-ink">{quotation.quantity}</p>
                  </div>

                  {quotation.preferredMaterial && (
                    <div>
                      <p className="text-sm text-ink/60 mb-1">Preferred Material</p>
                      <p className="font-medium text-ink">{quotation.preferredMaterial}</p>
                    </div>
                  )}

                  {quotation.preferredColor && (
                    <div>
                      <p className="text-sm text-ink/60 mb-1">Preferred Color</p>
                      <p className="font-medium text-ink">{quotation.preferredColor}</p>
                    </div>
                  )}

                  {quotation.requiredByDate && (
                    <div>
                      <p className="text-sm text-ink/60 mb-1">Required By</p>
                      <p className="font-medium text-ink">{formatDate(quotation.requiredByDate)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Custom Dimensions */}
            {quotation.hasCustomDimensions && (
              <div className="bg-white border-2 border-ink/10 rounded-2xl p-6 mb-6">
                <h2 className="font-semibold text-xl text-ink mb-4">Custom Dimensions</h2>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-ink/60 mb-1">Length</p>
                    <p className="font-medium text-ink">{quotation.customLengthMm} mm</p>
                  </div>

                  <div>
                    <p className="text-sm text-ink/60 mb-1">Width</p>
                    <p className="font-medium text-ink">{quotation.customWidthMm} mm</p>
                  </div>

                  <div>
                    <p className="text-sm text-ink/60 mb-1">Height</p>
                    <p className="font-medium text-ink">{quotation.customHeightMm} mm</p>
                  </div>
                </div>
              </div>
            )}

            {/* Budget */}
            {(quotation.budgetMinPaise || quotation.budgetMaxPaise) && (
              <div className="bg-white border-2 border-ink/10 rounded-2xl p-6 mb-6">
                <h2 className="font-semibold text-xl text-ink mb-4">Budget Range</h2>

                <p className="text-ink">
                  {quotation.budgetMinPaise && quotation.budgetMaxPaise
                    ? `${formatPrice(quotation.budgetMinPaise)} - ${formatPrice(quotation.budgetMaxPaise)}`
                    : quotation.budgetMinPaise
                    ? `From ${formatPrice(quotation.budgetMinPaise)}`
                    : quotation.budgetMaxPaise
                    ? `Up to ${formatPrice(quotation.budgetMaxPaise)}`
                    : "Not specified"}
                </p>
              </div>
            )}

            {/* Additional Notes */}
            {quotation.additionalNotes && (
              <div className="bg-white border-2 border-ink/10 rounded-2xl p-6 mb-6">
                <h2 className="font-semibold text-xl text-ink mb-4">Additional Notes</h2>

                <p className="text-ink/80 whitespace-pre-line">{quotation.additionalNotes}</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
