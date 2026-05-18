
INSERT INTO storage.buckets (id, name, public) VALUES ('tv-media', 'tv-media', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "TV media public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tv-media');

CREATE POLICY "TV media authenticated upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'tv-media');

CREATE POLICY "TV media authenticated update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'tv-media');

CREATE POLICY "TV media authenticated delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'tv-media');
