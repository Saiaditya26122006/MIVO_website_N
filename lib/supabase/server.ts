/**
 * Supabase Server Client
 *
 * Use this client in:
 * - Server Components
 * - Server Actions
 * - API Route Handlers
 *
 * This client respects Row Level Security (RLS) and uses the current user's session.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env, isSupabaseConfigured } from "@/lib/env";

export async function createClient() {
  if (!isSupabaseConfigured()) {
    console.warn(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );

    const mockError = { message: "Supabase not configured", code: "NOT_CONFIGURED" };
    const mockResult = { data: null, error: mockError, count: null };

    function chainable(): Record<string, unknown> {
      const chain: Record<string, unknown> = {};
      const methods = [
        "select", "insert", "update", "upsert", "delete",
        "eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike",
        "is", "in", "contains", "containedBy", "filter",
        "not", "or", "match",
        "order", "limit", "range", "single", "maybeSingle",
        "csv", "returns",
      ];
      for (const m of methods) {
        chain[m] = (..._args: unknown[]) => chain;
      }
      chain.then = (resolve: (v: unknown) => void) => Promise.resolve(mockResult).then(resolve);
      return chain;
    }

    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
      },
      from: () => chainable(),
      rpc: async () => ({ data: null, error: mockError }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  const cookieStore = await cookies();

  return createServerClient(env.supabase.url, env.supabase.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch (error) {
          // Handle cookie setting errors (e.g., in middleware)
          console.error("Error setting cookies:", error);
        }
      },
    },
  });
}
