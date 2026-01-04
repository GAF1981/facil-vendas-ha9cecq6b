import { Employee } from './employee'

export interface FechamentoCaixa {
  id: number
  rota_id: number
  funcionario_id: number
  venda_total: number
  desconto_total: number
  valor_a_receber: number
  valor_dinheiro: number
  valor_pix: number
  valor_cheque: number
  valor_despesas: number
  dinheiro_aprovado: boolean
  pix_aprovado: boolean
  cheque_aprovado: boolean
  despesas_aprovadas: boolean
  responsavel_id: number | null
  status: 'Aberto' | 'Fechado'
  created_at: string
  // Joins
  funcionario?: {
    nome_completo: string
    foto_url?: string | null
  }
  responsavel?: {
    nome_completo: string
  }
}

export interface FechamentoInsert {
  rota_id: number
  funcionario_id: number
  venda_total: number
  desconto_total: number
  valor_a_receber: number
  valor_dinheiro: number
  valor_pix: number
  valor_cheque: number
  valor_despesas: number
  status: 'Aberto'
}
