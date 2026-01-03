import { supabase } from '@/lib/supabase/client'
import { Rota, RotaItem } from '@/types/rota'
import { cobrancaService } from './cobrancaService'
import { pendenciasService } from './pendenciasService'
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
    // Determine next ID explicitly
    const { data: maxIdData } = await supabase
      .from('ROTA')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextId = (maxIdData?.id || 0) + 1

    const { data, error } = await supabase
      .from('ROTA')
      .insert({
        id: nextId,
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

  async finishAndStartNewRoute(currentRotaId: number) {
    // 1. Close current route
    const { error: endError } = await supabase
      .from('ROTA')
      .update({
        data_fim: new Date().toISOString(),
      })
      .eq('id', currentRotaId)

    if (endError) throw endError

    // 2. Start new route with incremented ID
    // Reusing startRota logic but ensuring we have the latest ID context
    const { data: maxIdData } = await supabase
      .from('ROTA')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Typically currentRotaId should be the max, but we fetch safely
    const nextId = (maxIdData?.id || currentRotaId) + 1

    const { data: newRota, error: startError } = await supabase
      .from('ROTA')
      .insert({
        id: nextId,
        data_inicio: new Date().toISOString(),
      })
      .select()
      .single()

    if (startError) throw startError

    return newRota as Rota
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
    // 1. Fetch all Clients with significantly increased limit to ensure full visibility
    // The requirement is to see ALL clients, specifically ones like ID 67 that might be at the end of the list
    const { data: clients, error: clientsError } = await supabase
      .from('CLIENTES')
      .select('*')
      .order('CODIGO', { ascending: false })
      .limit(50000) // Increased to 50k to cover all possible clients

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

    // 5. Fetch Projections (Using RPC as requested)
    const projectionMap = await this.getClientProjections()

    // 6. Fetch Products for pricing
    const { data: products } = await supabase
      .from('PRODUTOS')
      .select('CODIGO, PREÇO')
      .limit(10000)

    const priceMap = new Map<number, number>()
    products?.forEach((p) => {
      if (p.CODIGO) priceMap.set(p.CODIGO, parseCurrency(p.PREÇO))
    })

    // 7. Fetch basic Summary Stats + Last Order Number
    const { data: dbStats } = await supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"CÓDIGO DO CLIENTE", "DATA DO ACERTO", "SALDO FINAL", "VALOR VENDIDO", "COD. PRODUTO", "NÚMERO DO PEDIDO"',
      )
      .order('DATA DO ACERTO', { ascending: false })
      .limit(50000)

    const statsMap = new Map<
      number,
      {
        lastDate: string | null
        stockValue: number
        history: Set<string>
        lastOrderId: number | null
      }
    >()

    dbStats?.forEach((row: any) => {
      const cid = row['CÓDIGO DO CLIENTE']
      if (!cid) return

      if (!statsMap.has(cid)) {
        statsMap.set(cid, {
          lastDate: null,
          stockValue: 0,
          history: new Set(),
          lastOrderId: null,
        })
      }
      const entry = statsMap.get(cid)!

      if (row['DATA DO ACERTO']) {
        entry.history.add(row['DATA DO ACERTO'])
      }

      if (!entry.lastDate) {
        entry.lastDate = row['DATA DO ACERTO']
        // Since we are ordered by date desc, the first row with date is the last acerto
        if (row['NÚMERO DO PEDIDO']) {
          entry.lastOrderId = row['NÚMERO DO PEDIDO']
        }
      }

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
      const projection = projectionMap.get(cid) || 0

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
        projecao: projection,
        numero_pedido: stats?.lastOrderId || null,
        estoque: stats?.stockValue || 0,
        has_pendency: pendencyMap.has(cid),
        is_completed: completedSet.has(cid),
      }
    })
  },
}
