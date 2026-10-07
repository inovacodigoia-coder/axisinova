ALTER TABLE public.whatsapp_instancias REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_instancias;