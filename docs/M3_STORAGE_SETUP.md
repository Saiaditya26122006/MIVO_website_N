# Supabase Storage Setup (M3-P4)

This document describes the Supabase Storage configuration needed for product images. Storage setup is **optional for M3** (catalogue + auth), but documented here for future reference when implementing image uploads in M4 or admin features in M6.

## Overview

MIVO requires two storage buckets:

1. **product-images** (Public) - Product photos displayed on the site
2. **user-content** (Private) - Custom order files and customer uploads

## Storage Architecture

```
supabase-storage/
├── product-images/           [PUBLIC]
│   ├── categories/           - Category thumbnails
│   │   └── {category-slug}/
│   │       └── {image-id}.jpg
│   └── products/             - Product photos
│       └── {product-slug}/
│           ├── primary.jpg
│           ├── {variant-id}-1.jpg
│           └── {variant-id}-2.jpg
│
└── user-content/             [PRIVATE]
    └── custom-orders/        - Customer uploaded files
        └── {user-id}/
            └── {order-id}/
                └── {file-name}
```

## Bucket Configuration

### 1. Create product-images Bucket (Public)

**Settings**:
- Name: `product-images`
- Public: `true`
- File size limit: `5 MB`
- Allowed MIME types: `image/jpeg, image/png, image/webp`

**RLS Policies**:

```sql
-- Allow public read access
CREATE POLICY "Public read access for product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Only service role can upload/update/delete
-- (No policy for INSERT/UPDATE/DELETE = service role only)
```

**Why Public?**:
Product images must be accessible without authentication for the public catalogue. Supabase generates CDN URLs for public buckets with automatic optimization.

### 2. Create user-content Bucket (Private)

**Settings**:
- Name: `user-content`
- Public: `false`
- File size limit: `10 MB`
- Allowed MIME types: `image/jpeg, image/png, application/pdf, application/zip`

**RLS Policies**:

```sql
-- Users can upload to their own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-content' AND
  (storage.foldername(name))[1] = 'custom-orders' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Users can view their own files
CREATE POLICY "Users can view own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-content' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Users can delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-content' AND
  (storage.foldername(name))[2] = auth.uid()::text
);
```

**Why Private?**:
Customer uploads contain sensitive information (custom designs, specifications, contact details). Only the owner should access their files.

## Setup Steps (When Needed)

### Step 1: Create Buckets via Dashboard

1. Go to Supabase Dashboard → **Storage**
2. Click **New Bucket**
3. Create `product-images`:
   - Name: `product-images`
   - Public bucket: ✓ **enabled**
4. Create `user-content`:
   - Name: `user-content`  
   - Public bucket: ✗ **disabled**

### Step 2: Configure Bucket Policies

Run the following SQL in **SQL Editor**:

```sql
-- Product Images Bucket: Public read, admin write
CREATE POLICY "Public read access for product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- User Content Bucket: Owner-only access
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-content' AND
  (storage.foldername(name))[1] = 'custom-orders' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users can view own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-content' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-content' AND
  (storage.foldername(name))[2] = auth.uid()::text
);
```

### Step 3: Set File Size Limits

In **Storage Settings**:
- product-images: Max 5 MB per file
- user-content: Max 10 MB per file

### Step 4: Configure MIME Type Restrictions

Add allowed MIME types for each bucket:

**product-images**:
```
image/jpeg
image/png
image/webp
```

**user-content**:
```
image/jpeg
image/png
image/webp
application/pdf
application/zip
```

## Usage in Code

### Upload Product Image (Admin Only)

```typescript
import { createClient } from '@/lib/supabase/client';

async function uploadProductImage(
  productSlug: string,
  file: File,
  isPrimary: boolean = false
) {
  const supabase = createClient();
  
  const fileName = isPrimary
    ? 'primary.jpg'
    : `${crypto.randomUUID()}.jpg`;
  
  const path = `products/${productSlug}/${fileName}`;
  
  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });
  
  if (error) throw error;
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(path);
  
  return publicUrl;
}
```

### Upload Custom Order File (User)

```typescript
async function uploadCustomOrderFile(
  orderId: string,
  file: File
) {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const path = `custom-orders/${user.id}/${orderId}/${file.name}`;
  
  const { data, error } = await supabase.storage
    .from('user-content')
    .upload(path, file);
  
  if (error) throw error;
  
  return data.path;
}
```

### Get Signed URL for Private File

```typescript
async function getCustomOrderFileUrl(path: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase.storage
    .from('user-content')
    .createSignedUrl(path, 3600); // 1 hour expiry
  
  if (error) throw error;
  
  return data.signedUrl;
}
```

## Image Optimization

Supabase automatically optimizes images via CDN. You can request specific transformations:

```typescript
const { data: { publicUrl } } = supabase.storage
  .from('product-images')
  .getPublicUrl('products/desk-organizer/primary.jpg', {
    transform: {
      width: 800,
      height: 600,
      resize: 'cover',
      format: 'webp',
      quality: 80
    }
  });
```

**Supported Transformations**:
- `width`, `height`: Resize dimensions
- `resize`: `cover`, `contain`, `fill`
- `format`: `webp`, `jpeg`, `png`
- `quality`: 1-100

## Migration Strategy

Current product images in `products.json` reference placeholder URLs. When migrating to Supabase Storage:

### Option A: Keep External URLs (Current)

No changes needed. Products continue referencing external image URLs. This works for M3-M5.

**Pros**:
- No migration needed
- Works with existing data
- No storage costs

**Cons**:
- No CDN optimization
- No transformation support
- Dependent on external hosts

### Option B: Migrate to Supabase Storage (Future)

Upload images to `product-images` bucket and update database URLs.

**Migration Script** (pseudocode):
```typescript
for (const product of products) {
  for (const image of product.images) {
    // Download from current URL
    const response = await fetch(image.url);
    const blob = await response.blob();
    
    // Upload to Supabase
    const path = `products/${product.slug}/${image.id}.jpg`;
    await supabase.storage
      .from('product-images')
      .upload(path, blob);
    
    // Update database
    const publicUrl = supabase.storage
      .from('product-images')
      .getPublicUrl(path).data.publicUrl;
    
    await supabase
      .from('product_images')
      .update({ url: publicUrl })
      .eq('id', image.id);
  }
}
```

## Security Considerations

**Product Images (Public)**:
- ✓ Anyone can view
- ✗ Customers cannot upload
- ✗ Customers cannot delete
- ✓ Admin uses service role for write operations

**User Content (Private)**:
- ✓ Owner can upload to their folder only
- ✓ Owner can view their files only
- ✓ Owner can delete their files only
- ✗ Cannot access other users' files
- ✓ Admin uses service role for moderation

**Path Validation**:
Always validate file paths contain expected patterns:
```typescript
// Bad: User controls entire path
const path = userInput; // ❌ Path traversal risk

// Good: Construct path from validated components
const path = `custom-orders/${user.id}/${orderId}/${sanitize(fileName)}`;
```

## Testing Storage Policies

### Test Public Read Access (No Auth)

```typescript
// Should succeed
const { data, error } = await supabase.storage
  .from('product-images')
  .download('products/test/primary.jpg');
```

### Test Private Write Protection

```typescript
// Should fail (customers can't write to product-images)
const { error } = await supabase.storage
  .from('product-images')
  .upload('products/test/hacked.jpg', file);
// Expected: "new row violates row-level security policy"
```

### Test Private File Isolation

```typescript
// User A uploads file
const pathA = `custom-orders/${userA.id}/file.pdf`;
await supabaseA.storage
  .from('user-content')
  .upload(pathA, file);

// User B tries to access User A's file
const { error } = await supabaseB.storage
  .from('user-content')
  .download(pathA);
// Expected: "new row violates row-level security policy"
```

## Cost Estimation

Supabase Storage pricing (as of 2024):
- **Free tier**: 1 GB storage, 2 GB bandwidth/month
- **Pro tier**: $0.021/GB storage, $0.09/GB bandwidth

**Estimated usage for MIVO**:
- 50 products × 4 images × 200 KB = **40 MB** (product images)
- 100 custom orders × 2 MB = **200 MB** (user content)
- Total: ~250 MB storage (well within free tier)

Bandwidth depends on traffic. Estimate 1000 page views/month × 800 KB images = 800 MB/month (within free tier).

## When to Implement

Storage setup is **not required for M3**. Current product images use external URLs, which work fine for development and early production.

Implement Storage when:
- **M6 (Admin Portal)**: Admins need to upload product images
- **M7 (Custom Orders)**: Customers upload design files
- **Production Scale**: Need CDN optimization and transformations

## References

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Storage RLS Policies](https://supabase.com/docs/guides/storage/security/access-control)
- [Image Transformations](https://supabase.com/docs/guides/storage/serving/image-transformations)
