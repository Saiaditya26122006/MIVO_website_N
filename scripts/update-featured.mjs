import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ntrbvoxdvpywadiqgvtt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50cmJ2b3hkdnB5d2FkaXFndnR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0MTE5MjgsImV4cCI6MjEwNzk4NzkyOH0.9aJ8_XA9S3e6SJq0zDVcGl_a35sB2fqvSg1VMoehhic';
const supabase = createClient(supabaseUrl, supabaseKey);

// Mark 2 additional products as featured by ID
const productsToFeature = [
  { id: '3e997ad2-dc6c-a59c-8671-13ccf2819ebf', name: 'Hexagonal Pen Holder' },
  { id: 'ef23906b-656f-9cb1-3ed6-28a03d421e5c', name: 'Geometric Planter Pot' }
];

console.log('Marking additional products as featured...');

for (const product of productsToFeature) {
  const { data, error } = await supabase
    .from('products')
    .update({ featured: true })
    .eq('id', product.id)
    .select('name, slug');

  if (error) {
    console.error(`Error updating ${product.name}:`, error);
  } else if (data && data.length > 0) {
    console.log(`✓ Marked "${data[0].name}" as featured`);
  } else {
    console.log(`⚠ Product with ID "${product.id}" not found`);
  }
}

// Verify
const { data: featured, error: fetchError } = await supabase
  .from('products')
  .select('name, slug')
  .eq('featured', true)
  .order('name');

if (fetchError) {
  console.error('Error fetching featured products:', fetchError);
} else {
  console.log('\nFeatured products (5):');
  console.log('=====================');
  featured.forEach(p => {
    console.log(`• ${p.name}`);
  });
}
