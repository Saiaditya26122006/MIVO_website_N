/**
 * Supabase Browser Client
 *
 * Use this client in Client Components (components with "use client" directive).
 * This client uses the anon key and respects Row Level Security (RLS) policies.
 */

import { createBrowserClient } from "@supabase/ssr";
import { env, isSupabaseConfigured } from "@/lib/env";

let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!isSupabaseConfigured()) {
    console.warn(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );

    // Return a mock client for development without Supabase.
    // Supports chaining patterns like .from("t").select("*").eq("id", x).single()
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
        signIn: async () => ({
          data: { user: null, session: null },
          error: new Error("Supabase not configured"),
        }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => {} } },
        }),
      },
      from: () => chainable(),
      rpc: async () => ({ data: null, error: mockError }),
      storage: {
        from: () => ({
          upload: async () => ({ data: null, error: mockError }),
          download: async () => ({ data: null, error: mockError }),
        }),
      },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  if (!clientInstance) {
    clientInstance = createBrowserClient(env.supabase.url, env.supabase.anonKey);
  }

  return clientInstance;
}
