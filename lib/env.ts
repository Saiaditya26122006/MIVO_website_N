/**
 * Environment Variable Validation
 *
 * This module validates and exports environment variables with proper typing.
 * Throws clear errors if required variables are missing.
 */

function getEnvVar(key: string, required: boolean = true): string {
  const value = process.env[key];

  if (required && !value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
        `Please check your .env.local file and ensure ${key} is set.\n` +
        `See .env.example for reference.`
    );
  }

  return value || "";
}

// Public environment variables (safe for browser)
export const env = {
  // Application
  siteUrl: getEnvVar("NEXT_PUBLIC_SITE_URL", true),
  nodeEnv: getEnvVar("NODE_ENV", false) || "development",

  // Supabase (public keys)
  supabase: {
    url: getEnvVar("NEXT_PUBLIC_SUPABASE_URL", false),
    anonKey: getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY", false),
  },
} as const;

// Server-only environment variables (NEVER expose to browser)
// Only import this in server components, API routes, or server actions
export const serverEnv = {
  // Supabase service role (full database access)
  supabase: {
    serviceRoleKey: getEnvVar("SUPABASE_SERVICE_ROLE_KEY", false),
  },

  // Razorpay
  razorpay: {
    keyId: getEnvVar("RAZORPAY_KEY_ID", false),
    keySecret: getEnvVar("RAZORPAY_KEY_SECRET", false),
    webhookSecret: getEnvVar("RAZORPAY_WEBHOOK_SECRET", false),
  },

  // Email
  email: {
    provider: getEnvVar("EMAIL_PROVIDER", false) || "resend",
    apiKey: getEnvVar("EMAIL_API_KEY", false),
    fromAddress: getEnvVar("EMAIL_FROM_ADDRESS", false) || "hello@mivo.in",
    fromName: getEnvVar("EMAIL_FROM_NAME", false) || "MIVO",
  },

  // File uploads
  uploads: {
    maxSizeMB: parseInt(getEnvVar("MAX_UPLOAD_SIZE_MB", false) || "10"),
    allowedExtensions:
      getEnvVar("ALLOWED_UPLOAD_EXTENSIONS", false) ||
      ".stl,.3mf,.step,.stp,.pdf,.jpg,.jpeg,.png",
  },

  // Rate limiting
  rateLimit: {
    quoteRequests: parseInt(getEnvVar("RATE_LIMIT_QUOTE_REQUESTS", false) || "5"),
    quoteWindowMinutes: parseInt(
      getEnvVar("RATE_LIMIT_QUOTE_WINDOW_MINUTES", false) || "15"
    ),
    contactRequests: parseInt(getEnvVar("RATE_LIMIT_CONTACT_REQUESTS", false) || "3"),
    contactWindowMinutes: parseInt(
      getEnvVar("RATE_LIMIT_CONTACT_WINDOW_MINUTES", false) || "15"
    ),
  },
} as const;

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(env.supabase.url && env.supabase.anonKey);
}

/**
 * Check if payment integration is configured
 */
export function isPaymentConfigured(): boolean {
  return !!(
    serverEnv.razorpay.keyId &&
    serverEnv.razorpay.keySecret &&
    serverEnv.razorpay.webhookSecret
  );
}

/**
 * Check if email is configured
 */
export function isEmailConfigured(): boolean {
  return !!(serverEnv.email.apiKey && serverEnv.email.fromAddress);
}
