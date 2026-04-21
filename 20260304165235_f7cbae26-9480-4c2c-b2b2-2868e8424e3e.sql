
-- Allow admins to upload testimonial images
CREATE POLICY "Admins can upload testimonial images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'store-assets'
  AND (storage.foldername(name))[1] = 'testimonials'
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admins to update testimonial images
CREATE POLICY "Admins can update testimonial images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'store-assets'
  AND (storage.foldername(name))[1] = 'testimonials'
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admins to delete testimonial images
CREATE POLICY "Admins can delete testimonial images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'store-assets'
  AND (storage.foldername(name))[1] = 'testimonials'
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow public read access to testimonial images
CREATE POLICY "Testimonial images are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'store-assets'
  AND (storage.foldername(name))[1] = 'testimonials'
);
