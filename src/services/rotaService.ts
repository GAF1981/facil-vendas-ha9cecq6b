import { supabase } from '@/lib/supabase/client'
import { Rota, RotaItem } from '@/types/rota'
import { cobrancaService } from './cobrancaService'
import { pendenciasService } from './pendenciasService'
import { reportsService } from './reportsService'
import { parseISO } from 'date-fns'
import { parseCurrency } from '@/lib/formatters'

export const rotaService = {
  async getActiveRota() {
    const { data, error } = await supabase
      .from('ROTA')
      .select('*')
      .is('data_fim', null)
      .order('data_inicio', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data as Rota | null
  },

  async getLastRota() {
    const { data, error } = await supabase
      .from('ROTA')
      .select('*')
      .not('data_fim', 'is', null)
      .order('data_fim', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data as Rota | null
  },

  async startRota() {
    const { data, error } = await supabase
      .from('ROTA')
      .insert({
        data_inicio: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data as Rota
  },

  async endRota(id: number) {
    const { data, error } = await supabase
      .from('ROTA')
      .update({
        data_fim: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Rota
  },

  async getRotaItems(rotaId: number) {
    const { data, error } = await supabase
      .from('ROTA_ITEMS')
      .select('*')
      .eq('rota_id', rotaId)

    if (error) throw error
    return data as RotaItem[]
  },

  async upsertRotaItem(
    item: Partial<RotaItem> & { rota_id: number; cliente_id: number },
  ) {
    const { data: existing, error: fetchError } = await supabase
      .from('ROTA_ITEMS')
      .select('id')
      .eq('rota_id', item.rota_id)
      .eq('cliente_id', item.cliente_id)
      .maybeSingle()

    if (fetchError) throw fetchError

    if (existing) {
      const { data, error } = await supabase
        .from('ROTA_ITEMS')
        .update(item)
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      return data
    } else {
      const { data, error } = await supabase
        .from('ROTA_ITEMS')
        .insert(item)
        .select()
        .single()
      if (error) throw error
      return data
    }
  },

  async getClientProjections() {
    const { data, error } = await supabase.rpc('get_client_projections')
    if (error) {
      console.error('Error calculating projections:', error)
      return new Map<number, number>()
    }
    const map = new Map<number, number>()
    if (data) {
      ;(data as any[]).forEach((d) => {
        map.set(d.client_id, d.projecao)
      })
    }
    return map
  },

  async getFullRotaData(rota: Rota | null) {
    // 1. Fetch all Clients
    const { data: clients, error: clientsError } = await supabase
      .from('CLIENTES')
      .select('*')
      .order('CODIGO', { ascending: false })

    if (clientsError) throw clientsError
    if (!clients) return []

    // 2. Fetch Debts
    const allDebts = await cobrancaService.getDebts()
    const debtMap = new Map(allDebts.map((d) => [d.clientId, d]))

    // 3. Fetch Pendencies
    const allPendencies = await pendenciasService.getAll(false) // Unresolved
    const pendencyMap = new Set(allPendencies.map((p) => p.cliente_id))

    // 4. Fetch Rota Items
    let rotaItemsMap = new Map<number, RotaItem>()
    if (rota) {
      const items = await this.getRotaItems(rota.id)
      items.forEach((i) => rotaItemsMap.set(i.cliente_id, i))
    }

    // 5. Fetch Projections and Order Info from Report Logic
    const reportData = await reportsService.getProjectionsReport()
    const projectionMap = new Map<
      number,
      { projection: number; orderId: number }
    >()

    reportData.forEach((row) => {
      if (!projectionMap.has(row.clientCode)) {
        projectionMap.set(row.clientCode, {
          projection: row.projection || 0,
          orderId: row.orderId,
        })
      }
    })

    // 6. Fetch Products for pricing
    const { data: products } = await supabase
      .from('PRODUTOS')
      .select('CODIGO, PREÇO')

    const priceMap = new Map<number, number>()
    products?.forEach((p) => {
      if (p.CODIGO) priceMap.set(p.CODIGO, parseCurrency(p.PREÇO))
    })

    // 7. Fetch basic Summary Stats (Latest Date and Stock Value)
    // We fetch more rows to ensure we cover enough history for calculations
    const { data: dbStats } = await supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"CÓDIGO DO CLIENTE", "DATA DO ACERTO", "SALDO FINAL", "VALOR VENDIDO", "COD. PRODUTO"',
      )
      .order('"DATA DO ACERTO"', { ascending: false })
      .limit(10000)

    const statsMap = new Map<
      number,
      { lastDate: string | null; stockValue: number; history: Set<string> }
    >()

    dbStats?.forEach((row: any) => {
      const cid = row['CÓDIGO DO CLIENTE']
      if (!cid) return

      if (!statsMap.has(cid)) {
        statsMap.set(cid, { lastDate: null, stockValue: 0, history: new Set() })
      }
      const entry = statsMap.get(cid)!

      // Capture history dates
      if (row['DATA DO ACERTO']) {
        entry.history.add(row['DATA DO ACERTO'])
      }

      // Logic for Stock Value:
      // We identify the latest "Acerto" date for this client (first one encountered since sorted DESC)
      if (!entry.lastDate) {
        entry.lastDate = row['DATA DO ACERTO']
      }

      // Accumulate stock value ONLY for the products belonging to the latest date
      if (row['DATA DO ACERTO'] === entry.lastDate) {
        const qty = row['SALDO FINAL'] || 0
        const pid = row['COD. PRODUTO']
        const price = priceMap.get(pid) || 0
        entry.stockValue += qty * price
      }
    })

    // 8. Check for Completed Status
    const completedSet = new Set<number>()
    if (rota) {
      const startDate = parseISO(rota.data_inicio)
      const endDate = rota.data_fim ? parseISO(rota.data_fim) : new Date()

      statsMap.forEach((val, key) => {
        const hasRecent = Array.from(val.history).some((dateStr) => {
          const d = parseISO(dateStr)
          return d >= startDate && d <= endDate
        })
        if (hasRecent) completedSet.add(key)
      })
    }

    return clients.map((client, index) => {
      const cid = client.CODIGO
      const debtInfo = debtMap.get(cid)
      const rotaItem = rotaItemsMap.get(cid)
      const stats = statsMap.get(cid)
      const projInfo = projectionMap.get(cid)

      const projecao = projInfo?.projection || 0
      const numero_pedido = projInfo?.orderId || null

      return {
        rowNumber: index + 1,
        client,
        x_na_rota: rotaItem?.x_na_rota || 0,
        boleto: rotaItem?.boleto || false,
        agregado: rotaItem?.agregado || false,
        vendedor_id: rotaItem?.vendedor_id || null,
        debito: debtInfo?.totalDebt || 0,
        quant_debito: debtInfo?.orderCount || 0,
        data_acerto: stats?.lastDate || null,
        projecao: projecao,
        numero_pedido: numero_pedido,
        estoque: stats?.stockValue || 0, // Now represents Monetary Value (R$)
        has_pendency: pendencyMap.has(cid),
        is_completed: completedSet.has(cid),
      }
    })
  },
}
