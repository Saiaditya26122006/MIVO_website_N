import { createClient } from "@/lib/supabase/server";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/auth/login");
  }

  const user = session.user;

  // Try to get customer profile
  const { data: profile } = await supabase
    .from("customer_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const emailVerified = !!user.email_confirmed_at;

  return (
    <>
      <Navigation />

      <main className="flex-1 pt-20 min-h-screen">
        <section className="py-12">
          <div className="max-w-4xl mx-auto px-6">
            <div className="mb-8">
              <h1 className="font-handwritten text-4xl md:text-5xl font-bold text-ink mb-2">
                My Account
                <span className="relative inline-block ml-2">
                  <span className="relative z-10">.</span>
                  <span className="absolute inset-0 bg-yellow opacity-60 -rotate-3 rounded" />
                </span>
              </h1>
              <p className="text-ink/70">Manage your MIVO account and preferences</p>
            </div>

            {/* Email Verification Banner */}
            {!emailVerified && (
              <div className="mb-8 p-6 bg-yellow/10 border-2 border-yellow/30 rounded-2xl">
                <div className="flex items-start gap-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-yellow flex-shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div className="flex-1">
                    <h3 className="font-semibold text-ink mb-1">
                      Email Verification Required
                    </h3>
                    <p className="text-sm text-ink/70 mb-3">
                      Please verify your email address to access all features and place
                      orders.
                    </p>
                    <Link href="/auth/verify-email">
                      <Button variant="secondary" size="sm">
                        Resend Verification Email
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Account Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white border-2 border-ink/10 rounded-2xl p-6">
                <h3 className="font-semibold text-ink mb-4">Account Information</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-ink/60">Email</p>
                    <p className="font-medium text-ink">{user.email}</p>
                  </div>
                  {profile?.display_name && (
                    <div>
                      <p className="text-sm text-ink/60">Name</p>
                      <p className="font-medium text-ink">{profile.display_name}</p>
                    </div>
                  )}
                  {profile?.phone && (
                    <div>
                      <p className="text-sm text-ink/60">Phone</p>
                      <p className="font-medium text-ink">{profile.phone}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border-2 border-ink/10 rounded-2xl p-6">
                <h3 className="font-semibold text-ink mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Link href="/account/profile">
                    <Button variant="secondary" className="w-full justify-start">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      Edit Profile
                    </Button>
                  </Link>

                  <Link href="/account/orders">
                    <Button variant="secondary" className="w-full justify-start">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2"
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
                      View Orders
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Recent Orders Preview */}
            <div className="bg-white border-2 border-ink/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-ink">Recent Orders</h3>
                <Link href="/account/orders" className="text-sm text-lime hover:underline">
                  View All
                </Link>
              </div>

              <p className="text-ink/60 text-sm">
                Your recent orders will appear here. Start shopping to place your first order!
              </p>

              <Link href="/explore" className="mt-4 inline-block">
                <Button variant="accent" size="md" className="rounded-full">
                  Browse Products
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
