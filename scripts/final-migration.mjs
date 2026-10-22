import { createAdminClient } from './supabase-client.mjs';

const supabase = createAdminClient();

async function createTableDirectly() {
  console.log('🔨 Creating contact_messages table using direct SQL...\n');

  // Create the table using raw SQL via REST API
  const createTableSQL = `
CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  enquiry_type text NOT NULL CHECK (enquiry_type IN (
    'custom_3d_printing',
    'product_enquiry',
    'cad_design',
    'existing_order',
    'quotation_request',
    'other'
  )),
  subject text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'archived')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
`;

  try {
    // Try using the SQL query endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query: createTableSQL })
    });

    console.log('Response status:', response.status);

  } catch (error) {
    console.error('Error:', error.message);
  }

  // Test if table exists by trying to query it
  console.log('\n🔍 Testing table access...');
  const { data, error } = await supabase
    .from('contact_messages')
    .select('id')
    .limit(1);

  if (error) {
    console.log('\n❌ Table not accessible via REST API');
    console.log('Error:', error.message);
    console.log('\n📋 MANUAL MIGRATION REQUIRED:');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('Please run this SQL in Supabase Dashboard:\n');
    console.log('1. Go to: https://supabase.com/dashboard/project/ntrbvoxdvpywadiqgvtt/editor');
    console.log('2. Click "SQL Editor" in the left sidebar');
    console.log('3. Click "New Query"');
    console.log('4. Copy the ENTIRE contents of this file:');
    console.log('   supabase/migrations/012_contact_messages.sql');
    console.log('5. Paste into the SQL Editor');
    console.log('6. Click "Run" or press Ctrl+Enter\n');
    console.log('✅ This will create the contact_messages table with all policies.');
    console.log('═══════════════════════════════════════════════════════\n');
    return false;
  } else {
    console.log('✅ Table exists and is accessible!\n');

    // Test insert
    console.log('🧪 Testing insert operation...');
    const { data: insertData, error: insertError } = await supabase
      .from('contact_messages')
      .insert({
        full_name: 'Migration Test',
        email: 'test@mivo.in',
        enquiry_type: 'other',
        message: 'This is a test message to verify the table works correctly.',
        status: 'new'
      })
      .select();

    if (insertError) {
      console.log('⚠️  Insert failed:', insertError.message);
      return false;
    } else {
      console.log('✅ Insert successful!');
      console.log('📊 Created message with ID:', insertData[0].id);

      // Clean up
      await supabase.from('contact_messages').delete().eq('id', insertData[0].id);
      console.log('🧹 Cleaned up test data\n');

      console.log('🎉 MIGRATION SUCCESSFUL!');
      console.log('📬 Contact form is now fully functional.');
      return true;
    }
  }
}

createTableDirectly();
