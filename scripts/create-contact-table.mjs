import postgres from 'postgres';

// Connection string from Supabase (you can find this in Supabase Dashboard > Project Settings > Database)
// Format: postgresql://postgres:[YOUR-PASSWORD]@db.ntrbvoxdvpywadiqgvtt.supabase.co:5432/postgres

const connectionString = process.env.SUPABASE_DB_URL || 'postgresql://postgres.ntrbvoxdvpywadiqgvtt:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';

console.log('⚠️  Direct PostgreSQL connection requires database password.');
console.log('📋 Please run the migration manually in Supabase Dashboard:\n');
console.log('1. Go to https://app.supabase.com/project/ntrbvoxdvpywadiqgvtt/editor');
console.log('2. Click SQL Editor');
console.log('3. Copy and paste the contents of: supabase/migrations/012_contact_messages.sql');
console.log('4. Click "Run"\n');
console.log('✅ The migration will create the contact_messages table with all policies.');
