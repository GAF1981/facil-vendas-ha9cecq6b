import { supabase } from '@/lib/supabase/client'
import {
  InventoryProduct,
  InventorySession,
  InventorySessionInsert,
} from '@/types/inventario'
import { parseCurrency } from '@/lib/formatters'

export const inventarioService = {
  async getProducts(
    page: number = 1,
    pageSize: number = 50,
    search: string = '',
  ): Promise<{ data: InventoryProduct[]; totalCount: number }> {
    let query = supabase
      .from('PRODUTOS')
      .select(
        'ID, CODIGO, codigo_interno, PRODUTO, GRUPO, PREÇO, "CÓDIGO BARRAS"',
        {
          count: 'exact',
        },
      )

    if (search) {
      const searchTerm = search.trim()
      const isNumber = !isNaN(Number(searchTerm)) && searchTerm !== ''

      if (isNumber) {
        query = query.or(
          `ID.eq.${searchTerm},CODIGO.eq.${searchTerm},codigo_interno.eq.${searchTerm},"CÓDIGO BARRAS".eq.${searchTerm},PRODUTO.ilike.%${searchTerm}%`,
        )
      } else {
        query = query.ilike('PRODUTO', `%${searchTerm}%`)
      }
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await query
      .order('PRODUTO', { ascending: true })
      .range(from, to)

    if (error) {
      console.error('Error fetching inventory products:', error)
      throw error
    }

    const mappedData: InventoryProduct[] = (data || []).map((item: any) => ({
      id: item.ID,
      codigo: item.CODIGO,
      codigo_interno: item.codigo_interno,
      produto: item.PRODUTO,
      grupo: item.GRUPO,
      preco:
        typeof item.PREÇO === 'string'
          ? parseCurrency(item.PREÇO)
          : Number(item.PREÇO || 0),
      codigo_barras: item['CÓDIGO BARRAS'],
    }))

    return {
      data: mappedData,
      totalCount: count || 0,
    }
  },

  async getActiveSession(): Promise<InventorySession | null> {
    const { data, error } = await supabase
      .from('sessoes_inventario')
      .select('*')
      .eq('status', 'em_andamento')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error fetching active session:', error)
      throw error
    }

    return data as InventorySession | null
  },

  async startSession(
    funcionarioId: number | null,
    tipo: 'GERAL' | 'PARCIAL' = 'GERAL',
  ): Promise<InventorySession> {
    const newSession: InventorySessionInsert = {
      data_inicio: new Date().toISOString(),
      funcionario_id: funcionarioId,
      status: 'em_andamento',
      tipo: tipo,
    }

    const { data, error } = await supabase
      .from('sessoes_inventario')
      .insert(newSession)
      .select()
      .single()

    if (error) {
      console.error('Error starting session:', error)
      throw error
    }

    return data as InventorySession
  },

  async finishSession(sessionId: number): Promise<void> {
    const { error } = await supabase
      .from('sessoes_inventario')
      .update({
        status: 'finalizado',
        data_fim: new Date().toISOString(),
      })
      .eq('id', sessionId)

    if (error) {
      console.error('Error finishing session:', error)
      throw error
    }
  },

  async getSessionCounts(sessionId: number): Promise<Record<number, number>> {
    const { data, error } = await supabase
      .from('CONTAGEM DE ESTOQUE FINAL' as any)
      .select('produto_id, quantidade')
      .eq('session_id', sessionId)

    if (error) {
      console.error('Error fetching session counts:', error)
      return {}
    }

    const counts: Record<number, number> = {}
    data?.forEach((row: any) => {
      counts[row.produto_id] = row.quantidade
    })
    return counts
  },

  async saveFinalCounts(
    items: any[],
    sessionId: number,
    employeeId: number | null,
  ) {
    if (items.length === 0) return
    const { error } = await supabase.rpc('process_inventory_batch', {
      p_session_id: sessionId,
      p_items: items,
      p_funcionario_id: employeeId || 0,
    })
    if (error) throw error
  },
}
