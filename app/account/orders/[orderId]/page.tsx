"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import type { Order, OrderLineItem } from "@/lib/data/cart-types";
import Link from "next/link";

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

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [lineItems, setLineItems] = useState<OrderLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function loadOrder() {
      const supabase = createClient();

      // Check authentication
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login?redirect=/account/orders");
        return;
      }

      // Fetch order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .eq("customer_id", user.id)
        .single();

      if (orderError || !orderData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Fetch line items
      const { data: itemsData, error: itemsError } = await supabase
        .from("order_line_items")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      if (itemsError) {
        console.error("[Order Detail] Failed to load line items:", itemsError);
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Map to TypeScript types
      const mappedOrder: Order = {
        id: orderData.id,
        orderNumber: orderData.order_number,
        customerId: orderData.customer_id,
        status: orderData.status,
        customerName: orderData.customer_name,
        customerEmail: orderData.customer_email,
        customerPhone: orderData.customer_phone,
        shippingAddressLine1: orderData.shipping_address_line1,
        shippingAddressLine2: orderData.shipping_address_line2,
        shippingCity: orderData.shipping_city,
        shippingState: orderData.shipping_state,
        shippingPostalCode: orderData.shipping_postal_code,
        shippingCountry: orderData.shipping_country,
        items: [],
        subtotalPaise: orderData.subtotal_paise,
        shippingPaise: orderData.shipping_paise,
        totalPaise: orderData.total_paise,
        paymentMethod: orderData.payment_method,
        paymentId: orderData.payment_id,
        paymentStatus: orderData.payment_status,
        createdAt: orderData.created_at,
        updatedAt: orderData.updated_at,
        paidAt: orderData.paid_at,
        shippedAt: orderData.shipped_at,
        deliveredAt: orderData.delivered_at,
      };

      const mappedItems: OrderLineItem[] = (itemsData || []).map((item: Record<string, unknown>) => ({
        id: item.id,
        productId: item.product_id,
        productName: item.product_name,
        variantId: item.variant_id,
        variantSku: item.variant_sku,
        sizeName: item.size_name,
        material: item.material,
        selectedColor: item.selected_color,
        quantity: item.quantity,
        unitPricePaise: item.unit_price_paise,
        lineTotalPaise: item.line_total_paise,
      }));

      setOrder(mappedOrder);
      setLineItems(mappedItems);
      setLoading(false);
    }

    loadOrder();
  }, [orderId, router]);

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

  if (notFound || !order) {
    return (
      <>
        <Navigation />
        <main className="flex-1 pt-20 min-h-screen">
          <section className="py-16">
            <div className="max-w-4xl mx-auto px-6 text-center">
              <h1 className="font-handwritten text-4xl md:text-5xl font-bold text-ink mb-4">
                Order Not Found
              </h1>
              <p className="text-ink/70 mb-8">The order you're looking for doesn't exist or you don't have access to it.</p>
              <Link href="/account/orders">
                <Button variant="accent" size="lg" className="rounded-full">
                  View All Orders
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
            {/* Header */}
            <div className="mb-8">
              <Link
                href="/account/orders"
                className="text-sm text-ink/60 hover:text-lime transition-colors mb-4 inline-flex items-center gap-1"
              >
                ← Back to Orders
              </Link>

              <div className="flex items-center justify-between flex-wrap gap-4 mt-4">
                <div>
                  <h1 className="font-handwritten text-4xl md:text-5xl font-bold text-ink">
                    Order {order.orderNumber}
                  </h1>
                  <p className="text-ink/60 mt-2">Placed on {formatDate(order.createdAt)}</p>
                </div>

                <div className={`px-4 py-2 rounded-full border-2 font-medium ${statusBadge.className}`}>
                  {statusBadge.label}
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white border-2 border-ink/10 rounded-2xl p-6 mb-6">
              <h2 className="font-semibold text-xl text-ink mb-4">Order Items</h2>

              <div className="space-y-4">
                {lineItems.map((item) => (
                  <div key={item.id} className="flex justify-between py-4 border-b border-ink/10 last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-ink">{item.productName}</p>
                      <p className="text-sm text-ink/60">
                        Size: {item.sizeName} • Material: {item.material} • Color: {item.selectedColor}
                      </p>
                      <p className="text-xs text-ink/50 mt-1">SKU: {item.variantSku}</p>
                      <p className="text-sm text-ink/70 mt-1">Quantity: {item.quantity}</p>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold text-ink">{formatPrice(item.lineTotalPaise)}</p>
                      <p className="text-sm text-ink/50">{formatPrice(item.unitPricePaise)} each</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="mt-6 pt-6 border-t-2 border-ink/10 space-y-2">
                <div className="flex justify-between text-ink/70">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.subtotalPaise)}</span>
                </div>

                <div className="flex justify-between text-ink/70">
                  <span>Shipping</span>
                  <span>{formatPrice(order.shippingPaise)}</span>
                </div>

                <div className="flex justify-between font-semibold text-lg text-ink pt-2 border-t border-ink/10">
                  <span>Total</span>
                  <span>{formatPrice(order.totalPaise)}</span>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white border-2 border-ink/10 rounded-2xl p-6 mb-6">
              <h2 className="font-semibold text-xl text-ink mb-4">Shipping Address</h2>

              <div className="text-ink/80 space-y-1">
                <p className="font-medium text-ink">{order.customerName}</p>
                <p>{order.shippingAddressLine1}</p>
                {order.shippingAddressLine2 && <p>{order.shippingAddressLine2}</p>}
                <p>
                  {order.shippingCity}, {order.shippingState} {order.shippingPostalCode}
                </p>
                <p>{order.shippingCountry}</p>
                <p className="pt-2">Phone: {order.customerPhone}</p>
                <p>Email: {order.customerEmail}</p>
              </div>
            </div>

            {/* Payment Status */}
            <div className="bg-white border-2 border-ink/10 rounded-2xl p-6">
              <h2 className="font-semibold text-xl text-ink mb-4">Payment</h2>

              <div className="text-ink/80 space-y-2">
                <p>
                  Status:{" "}
                  <span
                    className={
                      order.paymentStatus === "completed"
                        ? "text-green-600 font-medium"
                        : order.paymentStatus === "failed"
                        ? "text-red-600 font-medium"
                        : "text-yellow-600 font-medium"
                    }
                  >
                    {order.paymentStatus === "completed"
                      ? "Paid"
                      : order.paymentStatus === "failed"
                      ? "Failed"
                      : order.paymentStatus === "initiated"
                      ? "Payment Initiated"
                      : "Pending"}
                  </span>
                </p>

                {order.paymentMethod && (
                  <p>
                    Method:{" "}
                    <span className="font-medium">
                      {order.paymentMethod === "cod"
                        ? "Cash on Delivery"
                        : order.paymentMethod === "razorpay"
                        ? "Online Payment"
                        : order.paymentMethod}
                    </span>
                  </p>
                )}

                {order.paymentId && (
                  <p className="text-xs text-ink/50">
                    Payment ID: {order.paymentId}
                  </p>
                )}

                {order.paymentStatus === "pending" && order.paymentMethod === "cod" && (
                  <p className="text-sm text-ink/60 mt-2">
                    Payment will be collected in cash when your order is delivered.
                  </p>
                )}

                {order.paymentStatus === "pending" && order.paymentMethod !== "cod" && (
                  <p className="text-sm text-ink/60 mt-2">
                    Payment is pending. You will receive payment instructions via email.
                  </p>
                )}

                {order.paymentStatus === "failed" && (
                  <p className="text-sm text-red-600 mt-2">
                    Payment failed. Please contact support or try placing a new order.
                  </p>
                )}

                {order.paidAt && (
                  <p className="text-sm text-ink/60 mt-2">Paid on {formatDate(order.paidAt)}</p>
                )}
              </div>
            </div>

            {/* Success Message for New Orders */}
            {order.status === "confirmed" && order.paymentStatus === "completed" && (
              <div className="mt-8 p-6 bg-lime/10 border-2 border-lime/30 rounded-2xl">
                <h3 className="font-semibold text-lg text-ink mb-2">Payment Successful!</h3>
                <p className="text-ink/80">
                  Thank you for your payment. Your order is confirmed and will be processed shortly.
                  We'll send you tracking information once your order ships.
                </p>
              </div>
            )}

            {order.status === "pending_payment" && order.paymentMethod === "cod" && (
              <div className="mt-8 p-6 bg-lime/10 border-2 border-lime/30 rounded-2xl">
                <h3 className="font-semibold text-lg text-ink mb-2">Order Placed Successfully!</h3>
                <p className="text-ink/80">
                  Thank you for your order. Your order will be processed and shipped soon.
                  Please keep the exact amount ready for cash payment on delivery.
                </p>
              </div>
            )}

            {order.status === "pending_payment" && order.paymentMethod !== "cod" && (
              <div className="mt-8 p-6 bg-yellow/10 border-2 border-yellow/30 rounded-2xl">
                <h3 className="font-semibold text-lg text-ink mb-2">Payment Pending</h3>
                <p className="text-ink/80">
                  Your order has been placed but payment is pending. Please complete the payment to confirm your order.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
