"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { updateOrderStatus, type OrderStatus } from "../actions";

interface OrderData {
  id: string;
  orderReference: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddressLine1: string;
  shippingAddressLine2: string | null;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;
  subtotalPaise: number;
  shippingPaise: number;
  totalPaise: number;
  createdAt: string;
  items: OrderItemData[];
}

interface OrderItemData {
  id: string;
  productName: string;
  variantName: string;
  selectedColor: string | null;
  quantity: number;
  unitPricePaise: number;
  lineTotalPaise: number;
}

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
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

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function loadOrder() {
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

      // Load order
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_line_items(*)
        `)
        .eq("id", orderId)
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const items: OrderItemData[] = ((data.order_line_items as Record<string, unknown>[]) || []).map((item) => ({
        id: item.id as string,
        productName: item.product_name as string,
        variantName: `${item.size_name} - ${item.material}`,
        selectedColor: item.selected_color as string | null,
        quantity: item.quantity as number,
        unitPricePaise: item.unit_price_paise as number,
        lineTotalPaise: item.line_total_paise as number,
      }));

      setOrder({
        id: data.id,
        orderReference: data.order_number,
        status: data.status,
        customerName: data.customer_name,
        customerEmail: data.customer_email,
        customerPhone: data.customer_phone,
        shippingAddressLine1: data.shipping_address_line1,
        shippingAddressLine2: data.shipping_address_line2,
        shippingCity: data.shipping_city,
        shippingState: data.shipping_state,
        shippingPostalCode: data.shipping_postal_code,
        shippingCountry: data.shipping_country,
        subtotalPaise: data.subtotal_paise,
        shippingPaise: data.shipping_paise,
        totalPaise: data.total_paise,
        createdAt: data.created_at,
        items,
      });

      setLoading(false);
    }

    loadOrder();
  }, [orderId, router]);

  async function handleUpdateStatus(newStatus: OrderStatus) {
    if (!order || updating) return;

    setUpdating(true);

    const result = await updateOrderStatus(order.id, newStatus);

    if (!result.success) {
      alert(`Failed to update order status: ${result.error || "Unknown error"}`);
      setUpdating(false);
      return;
    }

    setOrder({ ...order, status: newStatus });
    setUpdating(false);
  }

  if (loading) {
    return (
      <>
        <Navigation />
        <main className="flex-1 pt-20 min-h-screen flex items-center justify-center">
          <p className="text-ink/60">Loading order...</p>
        </main>
        <Footer />
      </>
    );
  }

  if (notFound || !order || !isAdmin) {
    return (
      <>
        <Navigation />
        <main className="flex-1 pt-20 min-h-screen">
          <section className="py-16">
            <div className="max-w-4xl mx-auto px-6 text-center">
              <h1 className="font-handwritten text-4xl md:text-5xl font-bold text-ink mb-4">
                Order Not Found
              </h1>
              <p className="text-ink/70 mb-8">The order you're looking for doesn't exist.</p>
              <Link href="/admin/orders">
                <Button variant="accent" size="lg" className="rounded-full">
                  Back to Orders
                </Button>
              </Link>
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  const statusBadge = getStatusBadge(order.status);

  return (
    <>
      <Navigation />

      <main className="flex-1 pt-20 min-h-screen">
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-6">
            <Link
              href="/admin/orders"
              className="text-sm text-ink/60 hover:text-lime transition-colors mb-4 inline-flex items-center gap-1"
            >
              ← Back to Orders
            </Link>

            <div className="flex items-center justify-between flex-wrap gap-4 mt-4 mb-8">
              <div>
                <h1 className="font-handwritten text-4xl md:text-5xl font-bold text-ink">
                  {order.orderReference}
                </h1>
                <p className="text-ink/60 mt-2">Placed on {formatDate(order.createdAt)}</p>
              </div>

              <div className={`px-4 py-2 rounded-full border-2 font-medium ${statusBadge.className}`}>
                {statusBadge.label}
              </div>
            </div>

            {/* Status Update Actions */}
            <div className="bg-white border-2 border-ink/10 rounded-2xl p-6 mb-6">
              <h2 className="font-semibold text-xl text-ink mb-4">Update Order Status</h2>

              <div className="flex flex-wrap gap-3">
                {order.status === "pending_payment" && (
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => handleUpdateStatus("confirmed")}
                    disabled={updating}
                  >
                    Mark as Confirmed
                  </Button>
                )}

                {order.status === "confirmed" && (
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => handleUpdateStatus("processing")}
                    disabled={updating}
                  >
                    Start Processing
                  </Button>
                )}

                {order.status === "processing" && (
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => handleUpdateStatus("shipped")}
                    disabled={updating}
                  >
                    Mark as Shipped
                  </Button>
                )}

                {order.status === "shipped" && (
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => handleUpdateStatus("delivered")}
                    disabled={updating}
                  >
                    Mark as Delivered
                  </Button>
                )}

                {order.status !== "cancelled" && order.status !== "delivered" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleUpdateStatus("cancelled")}
                    disabled={updating}
                  >
                    Cancel Order
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
                  <p className="font-medium text-ink">{order.customerName}</p>
                </div>

                <div>
                  <p className="text-sm text-ink/60">Email</p>
                  <p className="font-medium text-ink">{order.customerEmail}</p>
                </div>

                <div>
                  <p className="text-sm text-ink/60">Phone</p>
                  <p className="font-medium text-ink">{order.customerPhone}</p>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white border-2 border-ink/10 rounded-2xl p-6 mb-6">
              <h2 className="font-semibold text-xl text-ink mb-4">Shipping Address</h2>

              <p className="text-ink/80">
                {order.shippingAddressLine1}
                {order.shippingAddressLine2 && <>, {order.shippingAddressLine2}</>}
                <br />
                {order.shippingCity}, {order.shippingState} {order.shippingPostalCode}
                <br />
                {order.shippingCountry}
              </p>
            </div>

            {/* Order Items */}
            <div className="bg-white border-2 border-ink/10 rounded-2xl p-6 mb-6">
              <h2 className="font-semibold text-xl text-ink mb-4">Order Items</h2>

              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-4 pb-4 border-b border-ink/10 last:border-0 last:pb-0">
                    <div className="flex-1">
                      <p className="font-medium text-ink">{item.productName}</p>
                      <p className="text-sm text-ink/60">{item.variantName}</p>
                      {item.selectedColor && (
                        <p className="text-sm text-ink/60">Color: {item.selectedColor}</p>
                      )}
                      <p className="text-sm text-ink/60">Quantity: {item.quantity}</p>
                    </div>

                    <div className="text-right">
                      <p className="font-medium text-ink">{formatPrice(item.lineTotalPaise)}</p>
                      <p className="text-sm text-ink/60">{formatPrice(item.unitPricePaise)} each</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t-2 border-ink/10 space-y-2">
                <div className="flex justify-between text-ink/70">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.subtotalPaise)}</span>
                </div>

                <div className="flex justify-between text-ink/70">
                  <span>Shipping</span>
                  <span>{formatPrice(order.shippingPaise)}</span>
                </div>

                <div className="flex justify-between text-xl font-bold text-ink pt-2 border-t border-ink/10">
                  <span>Total</span>
                  <span>{formatPrice(order.totalPaise)}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
