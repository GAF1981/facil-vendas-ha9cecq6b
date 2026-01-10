import { supabase } from '@/lib/supabase/client'
import { StockReportRow, StockReportFilters } from '@/types/stockReport'
import { format, endOfDay, startOfDay, subDays } from 'date-fns'

export const stockReportService = {
  /**
   * Triggers the RPC function that calculates live stock data
   * and saves it as a new snapshot in RELATORIO_DE_ESTOQUE.
   * Returns the newly created snapshot data.
   */
  async processAndSaveSnapshot(): Promise<StockReportRow[]> {
    const { data, error } = await supabase.rpc(
      'process_and_save_stock_snapshot',
    )

    if (error) throw error
    return data as StockReportRow[]
  },

  /**
   * Fetches historical stock data from RELATORIO_DE_ESTOQUE based on filters.
   */
  async getStockHistory(
    filters: StockReportFilters,
  ): Promise<StockReportRow[]> {
    let query = supabase
      .from('RELATORIO_DE_ESTOQUE')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(2000)

    if (filters.numero_pedido) {
      query = query.eq('numero_pedido', parseInt(filters.numero_pedido))
    }

    if (filters.codigo_cliente) {
      query = query.eq('codigo_cliente', parseInt(filters.codigo_cliente))
    }

    if (filters.cliente_nome) {
      query = query.ilike('cliente_nome', `%${filters.cliente_nome}%`)
    }

    // Date filtering on created_at (Snapshot Date)
    if (filters.startDate) {
      query = query.gte(
        'created_at',
        startOfDay(filters.startDate).toISOString(),
      )
    }

    if (filters.endDate) {
      query = query.lte('created_at', endOfDay(filters.endDate).toISOString())
    } else if (!filters.startDate) {
      // If no date filter is provided, limit to last 7 days to avoid massive load
      // unless specific search params are present
      if (
        !filters.numero_pedido &&
        !filters.codigo_cliente &&
        !filters.cliente_nome
      ) {
        query = query.gte('created_at', subDays(new Date(), 7).toISOString())
      }
    }

    const { data, error } = await query

    if (error) throw error
    return data as StockReportRow[]
  },
}
