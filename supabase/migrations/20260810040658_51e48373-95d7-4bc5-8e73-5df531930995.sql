-- Storage policies for company-assets bucket
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Company assets public read'
    ) THEN
        CREATE POLICY "Company assets public read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'company-assets');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Company assets authenticated upload'
    ) THEN
        CREATE POLICY "Company assets authenticated upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'company-assets');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Company assets authenticated update'
    ) THEN
        CREATE POLICY "Company assets authenticated update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'company-assets');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Company assets authenticated delete'
    ) THEN
        CREATE POLICY "Company assets authenticated delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'company-assets');
    END IF;
END $$;