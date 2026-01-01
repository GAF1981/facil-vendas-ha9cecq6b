export interface NotaFiscalSettlement {
  orderId: number
  clientName: string // Added for global view
  dataAcerto: string
  valorTotalVendido: number
  notaFiscalCadastro: string
  notaFiscalVenda: string
  notaFiscalEmitida: string
}

export type NotaFiscalStatusFilter =
  | 'all'
  | 'Emitida'
  | 'Pendente'
  | 'Resolvida'

export const NOTA_FISCAL_STATUSES = ['Emitida', 'Pendente', 'Resolvida']
