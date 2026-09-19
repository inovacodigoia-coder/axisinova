ALTER TABLE public.support_cards
  ADD COLUMN IF NOT EXISTS source_order_id uuid,
  ADD COLUMN IF NOT EXISTS source_protocol text,
  ADD COLUMN IF NOT EXISTS source_order_number text;

CREATE INDEX IF NOT EXISTS idx_support_cards_source_order ON public.support_cards(source_order_id);