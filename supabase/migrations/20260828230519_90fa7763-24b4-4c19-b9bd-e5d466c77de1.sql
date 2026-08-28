CREATE TABLE public.lab_result_graphics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  order_id uuid REFERENCES public.attendance_orders(id),
  protocol text,
  sample_barcode text NOT NULL,
  equipment_id text,
  item_code text NOT NULL,
  label text,
  image_format text NOT NULL DEFAULT 'BMP',
  image_base64 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lab_result_graphics_company_order ON public.lab_result_graphics(company_id, order_id);
CREATE INDEX idx_lab_result_graphics_barcode ON public.lab_result_graphics(company_id, sample_barcode);

GRANT SELECT, INSERT ON public.lab_result_graphics TO authenticated;
GRANT ALL ON public.lab_result_graphics TO service_role;

ALTER TABLE public.lab_result_graphics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view graphics of their company"
ON public.lab_result_graphics FOR SELECT TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert graphics of their company"
ON public.lab_result_graphics FOR INSERT TO authenticated
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));