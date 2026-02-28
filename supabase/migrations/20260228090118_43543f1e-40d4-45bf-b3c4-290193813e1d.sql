CREATE TABLE public.contract_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  legal_risks JSONB,
  payment_delay_flags JSONB,
  financial_exposure JSONB,
  role_summaries JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(contract_id)
);

ALTER TABLE public.contract_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON public.contract_analyses FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.contract_analyses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.contract_analyses FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.contract_analyses FOR DELETE USING (true);