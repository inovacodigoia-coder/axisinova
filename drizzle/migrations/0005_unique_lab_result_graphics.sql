CREATE UNIQUE INDEX IF NOT EXISTS lab_result_graphics_unique_item
  ON public.lab_result_graphics (company_id, order_id, sample_barcode, equipment_id, item_code);