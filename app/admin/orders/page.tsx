"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface OrderSummary {
  id: string;
  orderReference: string;
  status: string;
  customerName: string;
  customerEmail: string;
  totalPaise: number;
  itemCount: number;
  createdAt: string;
}

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "pending_payment":
      return { label: "Pending Payment", className: "bg-yellow-100 text-yellow-800 border-yellow-300" };
    case "confirmed":
      return { label: "Confirmed", className: "bg-lime/20 text-ink border-lime" };
    case "processing":
      return { label: "Processing", className: "bg-blue-100 text-blue-800 border-blue-300" };
    case "shipped":
      return { label: "Shipped", className: "bg-purple-100 text-purple-800 border-purple-300" };
    case "delivered":
      return { label: "Delivered", className: "bg-green-100 text-green-800 border-green-300" };
    case "cancelled":
      return { label: "Cancelled", className: "bg-red-100 text-red-800 border-red-300" };
    default:
      return { label: status, className: "bg-gray-100 text-gray-800 border-gray-300" };
  }
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    async function loadOrders() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login?redirect=/admin/orders");
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

      // Load all orders
      let query = supabase
        .from("orders")
        .select(`
          id,
          order_reference,
          status,
          customer_name,
          customer_email,
          total_paise,
          created_at,
          order_items:order_items(id)
        `)
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;

      if (error) {
        console.error("[Admin Orders] Failed to load:", error);
        setLoading(false);
        return;
      }

      const ordersList: OrderSummary[] = (data || []).map((o: Record<string, unknown>) => ({
        id: o.id as string,
        orderReference: o.order_reference as string,
        status: o.status as string,
        customerName: o.customer_name as string,
        customerEmail: o.customer_email as string,
        totalPaise: o.total_paise as number,
        itemCount: ((o.order_items as unknown[]) || []).length,
        createdAt: o.created_at as string,
      }));

      setOrders(ordersList);
      setLoading(false);
    }

    loadOrders();
  }, [router, filterStatus]);

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="flex-1 pt-20 min-h-screen flex items-center justify-center">
          <p className="text-ink/60">Loading orders...</p>
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
                  Order Management
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
                All Orders
              </button>
              <button
                onClick={() => setFilterStatus("pending_payment")}
                className={`px-4 py-2 rounded-full border-2 font-medium transition-all ${
                  filterStatus === "pending_payment"
                    ? "bg-lime text-ink border-lime"
                    : "bg-white text-ink/70 border-ink/10 hover:border-lime/30"
                }`}
              >
                Pending Payment
              </button>
              <button
                onClick={() => setFilterStatus("confirmed")}
                className={`px-4 py-2 rounded-full border-2 font-medium transition-all ${
                  filterStatus === "confirmed"
                    ? "bg-lime text-ink border-lime"
                    : "bg-white text-ink/70 border-ink/10 hover:border-lime/30"
                }`}
              >
                Confirmed
              </button>
              <button
                onClick={() => setFilterStatus("processing")}
                className={`px-4 py-2 rounded-full border-2 font-medium transition-all ${
                  filterStatus === "processing"
                    ? "bg-lime text-ink border-lime"
                    : "bg-white text-ink/70 border-ink/10 hover:border-lime/30"
                }`}
              >
                Processing
              </button>
              <button
                onClick={() => setFilterStatus("shipped")}
                className={`px-4 py-2 rounded-full border-2 font-medium transition-all ${
                  filterStatus === "shipped"
                    ? "bg-lime text-ink border-lime"
                    : "bg-white text-ink/70 border-ink/10 hover:border-lime/30"
                }`}
              >
                Shipped
              </button>
            </div>

            {orders.length === 0 ? (
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
                  {filterStatus === "all" ? "No orders found" : `No ${filterStatus} orders`}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const statusBadge = getStatusBadge(order.status);

                  return (
                    <Link
                      key={order.id}
                      href={`/admin/orders/${order.id}`}
                      className="block bg-white border-2 border-ink/10 rounded-2xl p-6 hover:border-lime/50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="font-semibold text-lg text-ink">{order.orderReference}</p>

                            <div
                              className={`px-3 py-1 rounded-full border text-xs font-medium ${statusBadge.className}`}
                            >
                              {statusBadge.label}
                            </div>
                          </div>

                          <div className="space-y-1 mb-3">
                            <p className="text-ink font-medium">{order.customerName}</p>
                            <p className="text-sm text-ink/60">{order.customerEmail}</p>
                          </div>

                          <div className="flex flex-wrap gap-4 text-sm text-ink/60">
                            <span>{order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}</span>
                            <span>•</span>
                            <span>{formatDate(order.createdAt)}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-2xl font-bold text-ink mb-1">{formatPrice(order.totalPaise)}</p>
                          <p className="text-sm text-ink/60">View Details →</p>
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
