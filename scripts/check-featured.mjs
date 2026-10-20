import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ntrbvoxdvpywadiqgvtt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50cmJ2b3hkdnB5d2FkaXFndnR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0MTE5MjgsImV4cCI6MjEwNzk4NzkyOH0.9aJ8_XA9S3e6SJq0zDVcGl_a35sB2fqvSg1VMoehhic';
const supabase = createClient(supabaseUrl, supabaseKey);

const { data: products, error } = await supabase
  .from('products')
  .select('id, name, slug, featured')
  .order('name');

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('Current Products:');
console.log('================');
products.forEach(p => {
  console.log(`[${p.featured ? 'FEATURED' : '        '}] ${p.name} (${p.slug})`);
});

console.log(`\nTotal: ${products.length} products`);
console.log(`Featured: ${products.filter(p => p.featured).length} products`);
