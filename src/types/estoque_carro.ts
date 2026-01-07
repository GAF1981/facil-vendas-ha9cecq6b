import { z } from 'zod'

export interface EstoqueCarroSession {
  id: number
  data_inicio: string
  data_fim: string | null
  funcionario_id: number
}

export interface EstoqueCarroItem {
  produto_id: number
  codigo: number | null
  produto: string
  tipo: string | null
  preco: number
  saldo_inicial: number
  entradas_cliente: number
  entradas_estoque: number
  saidas_cliente: number
  saidas_estoque: number
  saldo_final: number // Calculated
  contagem: number
  diferenca_qtd: number
  diferenca_val: number
  ajustes: number
  novo_saldo: number
}

export interface CountUpdatePayload {
  produto_id: number
  quantidade: number
}
