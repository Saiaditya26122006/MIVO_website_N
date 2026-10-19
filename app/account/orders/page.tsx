"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  totalPaise: number;
  createdAt: string;
  itemCount: number;
}

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
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
    case "pending_payment":
      return { label: "Pending Payment", className: "bg-yellow-100 text-yellow-800 border-yellow-300" };
    case "payment_failed":
      return { label: "Payment Failed", className: "bg-red-100 text-red-800 border-red-300" };
    case "confirmed":
      return { label: "Confirmed", className: "bg-lime/20 text-ink border-lime" };
    case "processing":
      return { label: "Processing", className: "bg-blue-100 text-blue-800 border-blue-300" };
    case "shipped":
      return { label: "Shipped", className: "bg-purple-100 text-purple-800 border-purple-300" };
    case "delivered":
      return { label: "Delivered", className: "bg-green-100 text-green-800 border-green-300" };
    case "cancelled":
      return { label: "Cancelled", className: "bg-gray-100 text-gray-800 border-gray-300" };
    default:
      return { label: status, className: "bg-gray-100 text-gray-800 border-gray-300" };
  }
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      const supabase = createClient();

      // Check authentication
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login?redirect=/account/orders");
        return;
      }

      // Fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("id, order_number, status, total_paise, created_at")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      if (ordersError) {
        console.error("[Orders] Failed to load orders:", ordersError);
        setLoading(false);
        return;
      }

      // Fetch item counts for each order
      const ordersWithCounts: OrderSummary[] = await Promise.all(
        (ordersData || []).map(async (order: Record<string, unknown>) => {
          const { count } = await supabase
            .from("order_line_items")
            .select("*", { count: "exact", head: true })
            .eq("order_id", order.id);

          return {
            id: order.id as string,
            orderNumber: order.order_number as string,
            status: order.status as string,
            totalPaise: order.total_paise as number,
            createdAt: order.created_at as string,
            itemCount: count || 0,
          };
        })
      );

      setOrders(ordersWithCounts);
      setLoading(false);
    }

    loadOrders();
  }, [router]);

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

  return (
    <>
      <Navigation />

      <main className="flex-1 pt-20 min-h-screen">
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-6">
            <div className="mb-8">
              <Link
                href="/account"
                className="text-sm text-ink/60 hover:text-lime transition-colors mb-4 inline-flex items-center gap-1"
              >
                ← Back to Account
              </Link>

              <h1 className="font-handwritten text-4xl md:text-5xl font-bold text-ink mt-4">
                My Orders
                <span className="relative inline-block ml-2">
                  <span className="relative z-10">.</span>
                  <span className="absolute inset-0 bg-yellow opacity-60 -rotate-3 rounded" />
                </span>
              </h1>
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

                <p className="text-ink/70 text-lg mb-6">You haven't placed any orders yet</p>

                <Link href="/explore">
                  <Button variant="accent" size="lg" className="rounded-full">
                    Start Shopping
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const statusBadge = getStatusBadge(order.status);

                  return (
                    <Link
                      key={order.id}
                      href={`/account/orders/${order.id}`}
                      className="block bg-white border-2 border-ink/10 rounded-2xl p-6 hover:border-lime/50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <p className="font-semibold text-lg text-ink">
                              Order {order.orderNumber}
                            </p>

                            <div className={`px-3 py-1 rounded-full border text-xs font-medium ${statusBadge.className}`}>
                              {statusBadge.label}
                            </div>
                          </div>

                          <div className="text-sm text-ink/60 space-y-1">
                            <p>Placed on {formatDate(order.createdAt)}</p>
                            <p>
                              {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="font-semibold text-xl text-ink">
                            {formatPrice(order.totalPaise)}
                          </p>
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
