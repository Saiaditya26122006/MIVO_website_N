import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ntrbvoxdvpywadiqgvtt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50cmJ2b3hkdnB5d2FkaXFndnR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0MTE5MjgsImV4cCI6MjEwNzk4NzkyOH0.9aJ8_XA9S3e6SJq0zDVcGl_a35sB2fqvSg1VMoehhic';
const supabase = createClient(supabaseUrl, supabaseKey);

// Get pen holder and planter pot IDs
const targetNames = ['Hexagonal Pen Holder', 'Geometric Planter Pot'];

for (const name of targetNames) {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, slug, featured')
    .ilike('name', `%${name}%`);

  if (error) {
    console.error(`Error finding ${name}:`, error);
  } else if (data && data.length > 0) {
    console.log(`Found: ${data[0].name}`);
    console.log(`  ID: ${data[0].id}`);
    console.log(`  Slug: ${data[0].slug}`);
    console.log(`  Featured: ${data[0].featured}`);
    console.log();
  } else {
    console.log(`Not found: ${name}\n`);
  }
}
