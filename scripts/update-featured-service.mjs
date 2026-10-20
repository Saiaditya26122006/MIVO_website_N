import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ntrbvoxdvpywadiqgvtt.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50cmJ2b3hkdnB5d2FkaXFndnR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjQxMTkyOCwiZXhwIjoyMTA3OTg3OTI4fQ.WkCfS-KeUnpiVE1DGMILoKaUS-iIoWj5QgwL3uhflPY';
const supabase = createClient(supabaseUrl, serviceKey);

// Mark 2 additional products as featured by ID using service role key
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
  console.log('\nFeatured products:');
  console.log('==================');
  featured.forEach(p => {
    console.log(`• ${p.name}`);
  });
  console.log(`\nTotal featured: ${featured.length}`);
}
