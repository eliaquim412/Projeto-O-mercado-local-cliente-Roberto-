-- Add RLS policies for banner uploads in store-assets bucket

-- Policy for store owners to upload banners
CREATE POLICY "Store owners can upload banners"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'store-assets' 
  AND (storage.foldername(name))[1] = 'banners'
  AND auth.role() = 'authenticated'
);

-- Policy for store owners to update their banners
CREATE POLICY "Store owners can update banners"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'store-assets' 
  AND (storage.foldername(name))[1] = 'banners'
  AND auth.role() = 'authenticated'
);

-- Policy for store owners to delete their banners
CREATE POLICY "Store owners can delete banners"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'store-assets' 
  AND (storage.foldername(name))[1] = 'banners'
  AND auth.role() = 'authenticated'
);

-- Policy for everyone to view banners (public access)
CREATE POLICY "Banners are publicly accessible"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'store-assets' 
  AND (storage.foldername(name))[1] = 'banners'
);