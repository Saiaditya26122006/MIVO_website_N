/**
 * Vitest Global Setup
 *
 * Configure test environment and mock environment variables
 */

// Mock required environment variables for tests
process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";

// Mock Supabase environment variables (optional in tests)
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
