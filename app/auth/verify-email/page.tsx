"use client";

import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

export default function VerifyEmailPage() {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleResend() {
    setResending(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("No user found. Please register again.");
      setResending(false);
      return;
    }

    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: user.email!,
    });

    if (resendError) {
      setError(resendError.message);
      setResending(false);
      return;
    }

    setResent(true);
    setCountdown(60);
    setResending(false);

    // Start countdown
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  return (
    <>
      <Navigation />

      <main className="flex-1 pt-20 min-h-screen">
        <section className="py-16">
          <div className="max-w-2xl mx-auto px-6">
            <div className="text-center mb-8">
              <div className="inline-block p-6 bg-lime/10 rounded-full mb-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16 text-lime"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>

              <h1 className="font-handwritten text-4xl md:text-5xl font-bold text-ink mb-4">
                Check Your Email
                <span className="relative inline-block ml-2">
                  <span className="relative z-10">!</span>
                  <span className="absolute inset-0 bg-yellow opacity-60 -rotate-3 rounded" />
                </span>
              </h1>

              <p className="text-ink/70 text-lg mb-8">
                We've sent you a verification link. Please check your email and click
                the link to verify your account.
              </p>

              <div className="bg-white border-2 border-ink/10 rounded-2xl p-8 mb-6">
                <div className="space-y-4 text-left">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-lime/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-lime font-bold text-sm">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-ink">Check your inbox</p>
                      <p className="text-sm text-ink/70">
                        Look for an email from MIVO with the subject "Confirm your signup"
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-lime/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-lime font-bold text-sm">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-ink">Click the verification link</p>
                      <p className="text-sm text-ink/70">
                        The link will expire in 24 hours for security
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-lime/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-lime font-bold text-sm">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-ink">Start using MIVO</p>
                      <p className="text-sm text-ink/70">
                        Once verified, you can sign in and access your account
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-800 text-sm mb-6">
                  {error}
                </div>
              )}

              {resent && !error && (
                <div className="p-4 bg-lime/10 border-2 border-lime/20 rounded-xl text-ink text-sm mb-6">
                  Verification email sent! Check your inbox.
                </div>
              )}

              <div className="flex flex-col items-center gap-4">
                <p className="text-sm text-ink/70">Didn't receive the email?</p>
                <Button
                  onClick={handleResend}
                  disabled={resending || countdown > 0}
                  variant="secondary"
                >
                  {resending
                    ? "Sending..."
                    : countdown > 0
                    ? `Resend in ${countdown}s`
                    : "Resend Verification Email"}
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
