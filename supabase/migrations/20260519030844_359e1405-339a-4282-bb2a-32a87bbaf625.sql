DROP POLICY IF EXISTS "TV media authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "TV media authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "TV media authenticated delete" ON storage.objects;
DROP POLICY IF EXISTS "TV media anon upload" ON storage.objects;
DROP POLICY IF EXISTS "TV media anon update" ON storage.objects;
DROP POLICY IF EXISTS "TV media anon delete" ON storage.objects;

CREATE POLICY "TV media anon upload"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'tv-media');

CREATE POLICY "TV media anon update"
  ON storage.objects
  FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'tv-media')
  WITH CHECK (bucket_id = 'tv-media');

CREATE POLICY "TV media anon delete"
  ON storage.objects
  FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'tv-media');