ALTER TABLE public.contracts
  ADD COLUMN parent_contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  ADD COLUMN revision_number INTEGER NOT NULL DEFAULT 0;