import { RegisterForm } from "@/components/auth/RegisterForm";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function RegisterPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If already logged in, redirect to account
  if (session) {
    redirect("/account");
  }

  return (
    <>
      <Navigation />

      <main className="flex-1 pt-20 min-h-screen">
        <section className="py-16">
          <div className="max-w-md mx-auto px-6">
            <div className="text-center mb-8">
              <h1 className="font-handwritten text-4xl md:text-5xl font-bold text-ink mb-4">
                Create Account
                <span className="relative inline-block ml-2">
                  <span className="relative z-10">.</span>
                  <span className="absolute inset-0 bg-yellow opacity-60 -rotate-3 rounded" />
                </span>
              </h1>
              <p className="text-ink/70">
                Join MIVO to start ordering custom 3D printed parts and designs.
              </p>
            </div>

            <div className="bg-white border-2 border-ink/10 rounded-2xl p-8 shadow-sm">
              <RegisterForm />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
