"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface QuotationSummary {
  id: string;
  quoteReference: string;
  status: string;
  projectTitle: string;
  customerName: string;
  customerEmail: string;
  quantity: number;
  createdAt: string;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
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

export default function AdminQuotationsPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<QuotationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    async function loadQuotations() {
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

      // Load all quotations
      let query = supabase
        .from("quotation_requests")
        .select("id, quote_reference, status, project_title, customer_name, customer_email, quantity, created_at")
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;

      if (error) {
        console.error("[Admin Quotations] Failed to load:", error);
        setLoading(false);
        return;
      }

      const quotationsList: QuotationSummary[] = (data || []).map((q: Record<string, unknown>) => ({
        id: q.id as string,
        quoteReference: q.quote_reference as string,
        status: q.status as string,
        projectTitle: q.project_title as string,
        customerName: q.customer_name as string,
        customerEmail: q.customer_email as string,
        quantity: q.quantity as number,
        createdAt: q.created_at as string,
      }));

      setQuotations(quotationsList);
      setLoading(false);
    }

    loadQuotations();
  }, [router, filterStatus]);

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="flex-1 pt-20 min-h-screen flex items-center justify-center">
          <p className="text-ink/60">Loading quotations...</p>
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
          <div className="max-w-6xl mx-auto px-6">
            <div className="mb-8">
              <Link
                href="/admin"
                className="text-sm text-ink/60 hover:text-lime transition-colors mb-4 inline-flex items-center gap-1"
              >
                ← Back to Dashboard
              </Link>

              <div className="flex items-center justify-between flex-wrap gap-4 mt-4">
                <h1 className="font-handwritten text-4xl md:text-5xl font-bold text-ink">
                  Quotation Management
                  <span className="relative inline-block ml-2">
                    <span className="relative z-10">.</span>
                    <span className="absolute inset-0 bg-yellow opacity-60 -rotate-3 rounded" />
                  </span>
                </h1>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="mb-6 flex flex-wrap gap-3">
              <button
                onClick={() => setFilterStatus("all")}
                className={`px-4 py-2 rounded-full border-2 font-medium transition-all ${
                  filterStatus === "all"
                    ? "bg-lime text-ink border-lime"
                    : "bg-white text-ink/70 border-ink/10 hover:border-lime/30"
                }`}
              >
                All Requests
              </button>
              <button
                onClick={() => setFilterStatus("pending_review")}
                className={`px-4 py-2 rounded-full border-2 font-medium transition-all ${
                  filterStatus === "pending_review"
                    ? "bg-lime text-ink border-lime"
                    : "bg-white text-ink/70 border-ink/10 hover:border-lime/30"
                }`}
              >
                Pending Review
              </button>
              <button
                onClick={() => setFilterStatus("under_review")}
                className={`px-4 py-2 rounded-full border-2 font-medium transition-all ${
                  filterStatus === "under_review"
                    ? "bg-lime text-ink border-lime"
                    : "bg-white text-ink/70 border-ink/10 hover:border-lime/30"
                }`}
              >
                Under Review
              </button>
              <button
                onClick={() => setFilterStatus("quote_provided")}
                className={`px-4 py-2 rounded-full border-2 font-medium transition-all ${
                  filterStatus === "quote_provided"
                    ? "bg-lime text-ink border-lime"
                    : "bg-white text-ink/70 border-ink/10 hover:border-lime/30"
                }`}
              >
                Quote Provided
              </button>
            </div>

            {quotations.length === 0 ? (
              <div className="bg-white border-2 border-ink/10 rounded-2xl p-12 text-center">
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>

                <p className="text-ink/70 text-lg">
                  {filterStatus === "all" ? "No quotation requests found" : `No ${filterStatus.replace('_', ' ')} requests`}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {quotations.map((quotation) => {
                  const statusBadge = getStatusBadge(quotation.status);

                  return (
                    <Link
                      key={quotation.id}
                      href={`/admin/quotations/${quotation.id}`}
                      className="block bg-white border-2 border-ink/10 rounded-2xl p-6 hover:border-lime/50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="font-semibold text-lg text-ink">{quotation.quoteReference}</p>

                            <div
                              className={`px-3 py-1 rounded-full border text-xs font-medium ${statusBadge.className}`}
                            >
                              {statusBadge.label}
                            </div>
                          </div>

                          <p className="text-ink font-medium mb-2">{quotation.projectTitle}</p>

                          <div className="space-y-1 mb-3">
                            <p className="text-sm text-ink/70">{quotation.customerName}</p>
                            <p className="text-sm text-ink/60">{quotation.customerEmail}</p>
                          </div>

                          <div className="flex flex-wrap gap-4 text-sm text-ink/60">
                            <span>Qty: {quotation.quantity}</span>
                            <span>•</span>
                            <span>{formatDate(quotation.createdAt)}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-sm text-ink/60 mt-1">View Details →</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
