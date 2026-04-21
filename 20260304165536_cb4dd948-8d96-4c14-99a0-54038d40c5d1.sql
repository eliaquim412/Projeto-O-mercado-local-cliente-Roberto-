DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can upload partner logos'
  ) THEN
    CREATE POLICY "Admins can upload partner logos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'store-assets'
      AND (storage.foldername(name))[1] = 'partner-logos'
      AND public.has_role(auth.uid(), 'admin')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can update partner logos'
  ) THEN
    CREATE POLICY "Admins can update partner logos"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'store-assets'
      AND (storage.foldername(name))[1] = 'partner-logos'
      AND public.has_role(auth.uid(), 'admin')
    )
    WITH CHECK (
      bucket_id = 'store-assets'
      AND (storage.foldername(name))[1] = 'partner-logos'
      AND public.has_role(auth.uid(), 'admin')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Admins can delete partner logos'
  ) THEN
    CREATE POLICY "Admins can delete partner logos"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'store-assets'
      AND (storage.foldername(name))[1] = 'partner-logos'
      AND public.has_role(auth.uid(), 'admin')
    );
  END IF;
END
$$;