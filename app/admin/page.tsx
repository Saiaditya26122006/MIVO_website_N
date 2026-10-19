import { createClient } from "@/lib/supabase/server";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/auth/login?redirect=/admin");
  }

  const user = session.user;

  // Check admin status
  const { data: profile } = await supabase
    .from("customer_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/");
  }

  // Get counts for dashboard
  const [
    { count: productsCount },
    { count: ordersCount },
    { count: quotationsCount },
    { count: customersCount },
  ] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("quotation_requests").select("*", { count: "exact", head: true }),
    supabase.from("customer_profiles").select("*", { count: "exact", head: true }),
  ]);

  return (
    <>
      <Navigation />

      <main className="flex-1 pt-20 min-h-screen">
        <section className="py-12">
          <div className="max-w-6xl mx-auto px-6">
            <div className="mb-8">
              <h1 className="font-handwritten text-4xl md:text-5xl font-bold text-ink mb-2">
                Admin Dashboard
                <span className="relative inline-block ml-2">
                  <span className="relative z-10">.</span>
                  <span className="absolute inset-0 bg-yellow opacity-60 -rotate-3 rounded" />
                </span>
              </h1>
              <p className="text-ink/70">Welcome back, {user.email}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white border-2 border-ink/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-ink/60">Products</p>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-lime"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-ink">{productsCount ?? 0}</p>
              </div>

              <div className="bg-white border-2 border-ink/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-ink/60">Orders</p>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-lime"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-ink">{ordersCount ?? 0}</p>
              </div>

              <div className="bg-white border-2 border-ink/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-ink/60">Quotations</p>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-lime"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-ink">{quotationsCount ?? 0}</p>
              </div>

              <div className="bg-white border-2 border-ink/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-ink/60">Customers</p>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-lime"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-ink">{customersCount ?? 0}</p>
              </div>
            </div>

            {/* Admin Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border-2 border-ink/10 rounded-2xl p-6">
                <h3 className="font-semibold text-xl text-ink mb-4">Product Management</h3>
                <p className="text-ink/70 text-sm mb-4">
                  Manage product catalogue, variants, pricing, and inventory.
                </p>
                <Link href="/admin/products">
                  <Button variant="accent" size="md" className="w-full rounded-full">
                    Manage Products
                  </Button>
                </Link>
              </div>

              <div className="bg-white border-2 border-ink/10 rounded-2xl p-6">
                <h3 className="font-semibold text-xl text-ink mb-4">Order Management</h3>
                <p className="text-ink/70 text-sm mb-4">
                  View orders, update status, and manage shipments.
                </p>
                <Link href="/admin/orders">
                  <Button variant="accent" size="md" className="w-full rounded-full">
                    Manage Orders
                  </Button>
                </Link>
              </div>

              <div className="bg-white border-2 border-ink/10 rounded-2xl p-6">
                <h3 className="font-semibold text-xl text-ink mb-4">Quotation Requests</h3>
                <p className="text-ink/70 text-sm mb-4">
                  Review quotation requests, provide quotes, and track status.
                </p>
                <Link href="/admin/quotations">
                  <Button variant="accent" size="md" className="w-full rounded-full">
                    Manage Quotations
                  </Button>
                </Link>
              </div>

              <div className="bg-white border-2 border-ink/10 rounded-2xl p-6">
                <h3 className="font-semibold text-xl text-ink mb-4">Customer Management</h3>
                <p className="text-ink/70 text-sm mb-4">
                  View customer profiles, order history, and support requests.
                </p>
                <Link href="/admin/customers">
                  <Button variant="accent" size="md" className="w-full rounded-full">
                    Manage Customers
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
