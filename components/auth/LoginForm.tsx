"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface LoginFormProps {
  redirectTo?: string;
}

export function LoginForm({ redirectTo = "/account" }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // Map Supabase errors to user-friendly messages
      if (signInError.message === "Invalid login credentials") {
        setError("Incorrect email or password");
      } else if (signInError.message.includes("Email not confirmed")) {
        setError("Please verify your email before logging in");
      } else {
        setError(signInError.message);
      }
      setLoading(false);
      return;
    }

    // Success - redirect
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-800 text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-ink mb-2">
          Email
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          disabled={loading}
          placeholder="your@email.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-ink mb-2">
          Password
        </label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          disabled={loading}
          placeholder="••••••••"
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <Link
          href="/auth/reset-password"
          className="text-lime hover:underline font-medium"
        >
          Forgot password?
        </Link>
      </div>

      <Button
        type="submit"
        variant="accent"
        size="lg"
        className="w-full"
        disabled={loading}
      >
        {loading ? "Signing in..." : "Sign In"}
      </Button>

      <div className="text-center text-sm text-ink/70">
        Don't have an account?{" "}
        <Link href="/auth/register" className="text-lime hover:underline font-medium">
          Sign up
        </Link>
      </div>
    </form>
  );
}
