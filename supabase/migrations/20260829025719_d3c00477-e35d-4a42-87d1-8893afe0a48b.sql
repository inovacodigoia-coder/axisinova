GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_exam_results TO authenticated;
GRANT ALL ON public.lab_exam_results TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_result_values TO authenticated;
GRANT ALL ON public.lab_result_values TO service_role;