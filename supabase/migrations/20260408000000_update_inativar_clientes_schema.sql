ALTER TABLE public.inativar_clientes
ADD COLUMN IF NOT EXISTS expositor_retirado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS observacoes_expositor TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDENTE';

-- Update existing records to have status PENDENTE if null
UPDATE public.inativar_clientes SET status = 'PENDENTE' WHERE status IS NULL;

-- Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_inativar_clientes_status ON public.inativar_clientes(status);
