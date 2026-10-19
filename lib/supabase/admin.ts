/**
 * Supabase Admin Client (Service Role)
 *
 * WARNING: This client bypasses Row Level Security (RLS)!
 *
 * Only use this for:
 * - Admin operations that need to bypass RLS
 * - Webhook handlers that need full database access
 * - Background jobs
 * - Operations that cannot be performed by regular users
 *
 * NEVER use this client based on user input without proper authorization checks.
 * NEVER expose this client or its key to the browser.
 */

import { createClient } from "@supabase/supabase-js";
import { env, serverEnv, isSupabaseConfigured } from "@/lib/env";

let adminClientInstance: ReturnType<typeof createClient> | null = null;

export function createAdminClient() {
  if (!isSupabaseConfigured() || !serverEnv.supabase.serviceRoleKey) {
    console.warn(
      "Supabase admin client is not configured. Set SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );

    // Return a mock client for development without service role key
    return {
      auth: {
        admin: {
          listUsers: async () => ({ data: { users: [] }, error: null }),
          getUserById: async () => ({ data: { user: null }, error: null }),
        },
      },
      from: () => ({
        select: () => Promise.resolve({ data: [], error: null }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => Promise.resolve({ data: null, error: null }),
        delete: () => Promise.resolve({ data: null, error: null }),
      }),
    } as any;
  }

  if (!adminClientInstance) {
    adminClientInstance = createClient(
      env.supabase.url,
      serverEnv.supabase.serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  return adminClientInstance;
}
