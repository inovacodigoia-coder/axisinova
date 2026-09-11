DROP POLICY IF EXISTS "tv_media_company_select" ON storage.objects;
CREATE POLICY "tv_media_company_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'tv-media'
  AND (storage.foldername(name))[1] = public.get_user_company_id(auth.uid())::text
);