/**
 * Supabase Client Helper for Scripts
 *
 * Loads Supabase credentials from environment variables.
 * NEVER commit credentials directly in scripts.
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Get environment variable with validation
 */
function getEnvVar(name, description) {
  const value = process.env[name];
  if (!value) {
    console.error(`❌ Error: ${name} environment variable is required`);
    console.error(`   ${description}`);
    process.exit(1);
  }
  return value;
}

/**
 * Create Supabase admin client with service role key
 * Credentials must be set in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
 */
export function createAdminClient() {
  const supabaseUrl = getEnvVar(
    'NEXT_PUBLIC_SUPABASE_URL',
    'Set your Supabase project URL in .env.local'
  );

  const serviceKey = getEnvVar(
    'SUPABASE_SERVICE_ROLE_KEY',
    'Set your service role key in .env.local (NEVER commit this key to git)'
  );

  console.log('✓ Supabase URL configured');
  console.log('✓ Service role key loaded from environment (not displayed for security)');

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
