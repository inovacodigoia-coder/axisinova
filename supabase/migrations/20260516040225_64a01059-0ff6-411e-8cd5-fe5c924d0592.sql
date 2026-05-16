-- Bucket privado para anexos de atendimento da recepção
INSERT INTO storage.buckets (id, name, public)
VALUES ('attendance-attachments', 'attendance-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users podem ler arquivos do bucket
CREATE POLICY "Authenticated read attendance attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'attendance-attachments');

-- Authenticated users podem enviar arquivos
CREATE POLICY "Authenticated upload attendance attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attendance-attachments');

-- Authenticated users podem atualizar metadados
CREATE POLICY "Authenticated update attendance attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'attendance-attachments');

-- Authenticated users podem deletar
CREATE POLICY "Authenticated delete attendance attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'attendance-attachments');