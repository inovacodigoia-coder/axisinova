ALTER TABLE public.exams 
ADD COLUMN IF NOT EXISTS measurement_unit text,
ADD COLUMN IF NOT EXISTS default_origin text,
ADD COLUMN IF NOT EXISTS default_destination text,
ADD COLUMN IF NOT EXISTS report_observations text;