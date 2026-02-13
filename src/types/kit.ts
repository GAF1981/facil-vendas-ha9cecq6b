import { ProductRow } from './product'

export interface Kit {
  id: number
  nome: string
  created_at: string
  items?: KitItem[]
}

export interface KitItem {
  id: number
  kit_id: number
  produto_id: number
  quantidade_padrao: number
  // Joined fields
  product?: ProductRow
}

export interface KitInsert {
  nome: string
}

export interface KitItemInsert {
  kit_id: number
  produto_id: number
  quantidade_padrao: number
}
