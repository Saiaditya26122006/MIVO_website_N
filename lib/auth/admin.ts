/**
 * Admin Authorization Utilities
 *
 * Server-side functions for checking admin status.
 * NEVER expose these checks to the client — always verify server-side.
 */

import { createClient } from "@/lib/supabase/server";

/**
 * Check if the current authenticated user is an admin
 *
 * @returns true if user is authenticated and has is_admin = true
 */
export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data: profile } = await supabase
    .from("customer_profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  return profile?.is_admin === true;
}

/**
 * Require admin access or throw
 *
 * Use in API routes and Server Components to block non-admin access.
 *
 * @throws Error if user is not authenticated or not an admin
 */
export async function requireAdmin(): Promise<void> {
  const admin = await isAdmin();

  if (!admin) {
    throw new Error("Admin access required");
  }
}
