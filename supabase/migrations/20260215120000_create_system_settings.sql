-- Create table for system settings
CREATE TABLE IF NOT EXISTS configuracoes_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT NOT NULL UNIQUE,
  valor TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default value for email report recipient
INSERT INTO configuracoes_sistema (chave, valor)
VALUES ('email_destinatario_relatorio', 'admin@example.com')
ON CONFLICT (chave) DO NOTHING;

-- Enable RLS
ALTER TABLE configuracoes_sistema ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow read access for authenticated users"
  ON configuracoes_sistema
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert/update access for authenticated users"
  ON configuracoes_sistema
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
