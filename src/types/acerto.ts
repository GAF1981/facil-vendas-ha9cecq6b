import { ProductRow } from './product'

export interface AcertoItem {
  uid: string // Temporary ID for UI handling
  produtoId: number
  produtoCodigo?: number | null
  produtoNome: string
  tipo: string | null
  precoUnitario: number
  saldoInicial: number
  contagem: number
  quantVendida: number
  valorVendido: number
  saldoFinal: number
  idVendaItens?: number | null
}

export interface Acerto {
  id?: number
  dataAcerto: string
  clienteId: number
  funcionarioId: number
  valorTotal: number
  observacoes?: string
  itens: AcertoItem[]
}

export interface LastAcertoInfo {
  data: string | null
  hora: string | null
}
