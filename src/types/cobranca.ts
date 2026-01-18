import { PaymentEntry } from './payment'

export interface Receivable {
  id: number
  vencimento: string | null
  valorRegistrado: number
  valorPago: number
  formaPagamento: string
  status: 'VENCIDO' | 'A VENCER' | 'PAGO'
  // New granular fields for collection control
  formaCobranca?: string | null
  dataCombinada?: string | null
  motivo?: string | null // New field
  // Metadata to indicate source
  source?: 'NEGOTIATION' | 'RECEIPT' | 'ORIGINAL'
}

export interface CollectionInstallment {
  id?: number
  vencimento: string
  valor: number
  forma_pagamento: string
}

export interface CollectionAction {
  id: number
  acao: string | null
  dataAcao: string | null
  novaDataCombinada: string | null
  funcionarioNome: string | null
  funcionarioId: number | null
  pedidoId: number | null
  clienteId: number | null
  clienteNome: string | null
  installments?: CollectionInstallment[]
  motivo?: string | null // New field
}

export interface CollectionActionInsert {
  acao: string
  dataAcao: string
  novaDataCombinada: string | null
  funcionarioNome: string
  funcionarioId: number
  pedidoId: number
  clienteId: number
  clienteNome: string
  installments?: CollectionInstallment[]
  motivo?: string | null // New field
}

export interface OrderDebt {
  orderId: number
  date: string // Data do Acerto
  totalValue: number // Sum of products (raw)
  discount: number
  netValue: number // total - discount
  paidValue: number // from RECEBIMENTOS
  remainingValue: number // Debito (Consistent with debitos_historico)
  status: 'VENCIDO' | 'A VENCER' | 'SEM DÉBITO'
  paymentDetails: PaymentEntry[] // From BANCO_DE_DADOS (Legacy/Reference)
  paymentsMade: { date: string; value: number }[] // From RECEBIMENTOS (History)
  installments: Receivable[] // Granular rows for display
  oldestOverdueDate: string | null
  // New columns
  formaPagamento: string // "Forma de Pagamento" (Order Level)
  valorDevido: number // "Valor Devido"
  collectionActionCount: number // New: Count of collection actions
  employeeName: string | null // NEW: Employee Name
}

export interface ClientDebt {
  clientId: number
  clientName: string
  clientType: string
  totalDebt: number
  totalPaid: number // Added field for total paid value
  orderCount: number
  status: 'VENCIDO' | 'A VENCER' | 'SEM DÉBITO'
  lastAcertoDate: string
  oldestOverdueDate: string | null
  earliestUnpaidDate: string | null // NEW: For determining "A VENCER" date
  orders: OrderDebt[]
  // New classification fields
  group: string | null
  routeGroup: string | null
  // New address fields
  address: string | null
  neighborhood: string | null
  city: string | null
  cep: string | null // NEW: CEP Data
  // New situation field
  situacao: string | null
  // New field for Total Action Count
  totalActionCount: number
  // NEW: Phone number
  phone: string | null
  telefone_cobranca: string | null // New
  email_cobranca: string | null // New
}

export interface LatestCollectionActionView {
  action_id: number | null
  pedido_id: number | null
  acao: string | null
  data_acao: string | null
  nova_data_combinada: string | null
  funcionario_nome: string | null
  cliente_id: number | null
  installment_id: number | null
  installment_vencimento: string | null
  installment_valor: number | null
  installment_forma_pagamento: string | null
  motivo?: string | null // New field if view is updated, otherwise manual fetch
}
