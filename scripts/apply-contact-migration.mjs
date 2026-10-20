import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = 'https://ntrbvoxdvpywadiqgvtt.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50cmJ2b3hkdnB5d2FkaXFndnR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjQxMTkyOCwiZXhwIjoyMTA3OTg3OTI4fQ.WkCfS-KeUnpiVE1DGMILoKaUS-iIoWj5QgwL3uhflPY';

const supabase = createClient(supabaseUrl, serviceKey);

async function applyMigration() {
  try {
    console.log('Reading migration file...');
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '012_contact_messages.sql');
    const sql = readFileSync(migrationPath, 'utf8');

    console.log('Applying migration to Supabase...');

    // Split into individual statements and execute
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`\nExecuting statement ${i + 1}/${statements.length}...`);

      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

      if (error) {
        // Try direct execution via REST API
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ query: statement }),
        });

        if (!response.ok) {
          console.error(`Error executing statement ${i + 1}:`, error);
          console.error('Statement:', statement.substring(0, 100) + '...');
        } else {
          console.log(`✓ Statement ${i + 1} executed successfully`);
        }
      } else {
        console.log(`✓ Statement ${i + 1} executed successfully`);
      }
    }

    console.log('\n✅ Migration completed!');

    // Verify table was created
    const { data, error } = await supabase
      .from('contact_messages')
      .select('count')
      .limit(1);

    if (error) {
      console.log('\n⚠️  Note: Could not verify table creation automatically.');
      console.log('Please run the migration SQL manually in Supabase Dashboard > SQL Editor');
      console.log('Migration file: supabase/migrations/012_contact_messages.sql');
    } else {
      console.log('\n✓ Table "contact_messages" is accessible');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.log('\nPlease apply the migration manually:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Run the contents of: supabase/migrations/012_contact_messages.sql');
    process.exit(1);
  }
}

applyMigration();
