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

    // 5. Fetch Projections (Optimized via RPC)
    const projectionMap = await this.getClientProjections()

    // 6. Fetch basic Summary Stats (Latest Date and Stock)
    // Using simple limit query for now as per legacy logic, but we could improve this later.
    // For now, we reuse the existing strategy to get Last Date for "Data Acerto" column
    const { data: dbStats } = await supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"CÓDIGO DO CLIENTE", "DATA DO ACERTO", "SALDO FINAL", "VALOR VENDIDO"',
      )
      .order('"DATA DO ACERTO"', { ascending: false })
      .limit(2000)

    const statsMap = new Map<
      number,
      { lastDate: string | null; stock: number; history: any[] }
    >()

    dbStats?.forEach((row: any) => {
      const cid = row['CÓDIGO DO CLIENTE']
      if (!cid) return

      if (!statsMap.has(cid)) {
        statsMap.set(cid, { lastDate: null, stock: 0, history: [] })
      }
      const entry = statsMap.get(cid)!

      if (!entry.lastDate) {
        entry.lastDate = row['DATA DO ACERTO']
        entry.stock = row['SALDO FINAL'] || 0
      }
      entry.history.push({
        date: row['DATA DO ACERTO'],
        value: parseCurrency(row['VALOR VENDIDO']),
      })
    })

    // 7. Check for Completed Status
    const completedSet = new Set<number>()
    if (rota) {
      const startDate = parseISO(rota.data_inicio)
      const endDate = rota.data_fim ? parseISO(rota.data_fim) : new Date()

      statsMap.forEach((val, key) => {
        const hasRecent = val.history.some((h) => {
          const d = parseISO(h.date)
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
        projecao: projectionMap.get(cid) || 0, // Using automated calculation
        estoque: stats?.stock || 0,
        has_pendency: pendencyMap.has(cid),
        is_completed: completedSet.has(cid),
      }
    })
  },
}
