export interface NotaFiscalSettlement {
  orderId: number
  clientCode: number
  clientName: string
  dataAcerto: string
  valorTotalVendido: number
  notaFiscalCadastro: string
  notaFiscalVenda: string
  solicitacaoNf: string
  notaFiscalEmitida: string
  numeroNotaFiscal?: string | null
  rotaId?: number | null // Added Rota ID
}

export type NotaFiscalStatusFilter =
  | 'all'
  | 'Emitida'
  | 'Pendente'
  | 'Resolvida'

export const NOTA_FISCAL_STATUSES = ['Emitida', 'Pendente', 'Resolvida']

export interface EmitInvoicePayload {
  pedidoId: number
  clienteId: number
  numeroNotaFiscal: string
  funcionarioId: number
}
