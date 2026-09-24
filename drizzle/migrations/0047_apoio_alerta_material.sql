ALTER TABLE public.apoio_catalogo_alerta DROP CONSTRAINT IF EXISTS apoio_catalogo_alerta_tipo_check;
ALTER TABLE public.apoio_catalogo_alerta ADD CONSTRAINT apoio_catalogo_alerta_tipo_check CHECK (tipo = ANY (ARRAY['desativado'::text, 'alterado'::text, 'material'::text]));
GRANT UPDATE (lido) ON public.apoio_catalogo_alerta TO authenticated;