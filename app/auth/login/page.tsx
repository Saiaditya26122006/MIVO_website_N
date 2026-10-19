import { LoginForm } from "@/components/auth/LoginForm";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If already logged in, redirect to account or specified page
  if (session) {
    redirect(searchParams.redirect || "/account");
  }

  // Validate redirect URL (only allow internal paths)
  const redirectTo =
    searchParams.redirect &&
    searchParams.redirect.startsWith("/") &&
    !searchParams.redirect.includes("..")
      ? searchParams.redirect
      : "/account";

  return (
    <>
      <Navigation />

      <main className="flex-1 pt-20 min-h-screen">
        <section className="py-16">
          <div className="max-w-md mx-auto px-6">
            <div className="text-center mb-8">
              <h1 className="font-handwritten text-4xl md:text-5xl font-bold text-ink mb-4">
                Welcome Back
                <span className="relative inline-block ml-2">
                  <span className="relative z-10">!</span>
                  <span className="absolute inset-0 bg-yellow opacity-60 -rotate-3 rounded" />
                </span>
              </h1>
              <p className="text-ink/70">
                Sign in to your MIVO account to manage orders and preferences.
              </p>
            </div>

            <div className="bg-white border-2 border-ink/10 rounded-2xl p-8 shadow-sm">
              <LoginForm redirectTo={redirectTo} />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
