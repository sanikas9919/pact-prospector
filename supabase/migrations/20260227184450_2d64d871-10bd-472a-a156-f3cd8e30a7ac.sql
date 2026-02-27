
-- Create contracts table
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  start_date TEXT,
  end_date TEXT,
  contract_type TEXT,
  total_contract_value TEXT,
  billing_cycle TEXT,
  billing_amount TEXT,
  scope_of_work TEXT,
  uploaded_file_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (public access for now - no auth required)
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for simplicity (no auth)
CREATE POLICY "Allow public read" ON public.contracts FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.contracts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.contracts FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.contracts FOR DELETE USING (true);

-- Create storage bucket for contract uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('contracts', 'contracts', true);

CREATE POLICY "Allow public upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'contracts');
CREATE POLICY "Allow public read storage" ON storage.objects FOR SELECT USING (bucket_id = 'contracts');
