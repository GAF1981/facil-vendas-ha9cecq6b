import { supabase } from '@/lib/supabase/client'
import { Rota, RotaItem } from '@/types/rota'
import { cobrancaService } from './cobrancaService'
import { pendenciasService } from './pendenciasService'
import { parseISO, isBefore, startOfDay } from 'date-fns'

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
    // 0.5 Bulk update counters for active items in current route
    // Calls the RPC function created in migration
    const { error: rpcError } = await supabase.rpc(
      'increment_rota_items_on_finalize',
      { p_rota_id: currentRotaId },
    )

    if (rpcError) {
      console.error('Error auto-incrementing x_na_rota:', rpcError)
      // We continue even if this fails, but log it
    }

    // 1. Close current route
    const { error: endError } = await supabase
      .from('ROTA')
      .update({
        data_fim: new Date().toISOString(),
      })
      .eq('id', currentRotaId)

    if (endError) throw endError

    // 2. Start new route with incremented ID
    const { data: maxIdData } = await supabase
      .from('ROTA')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

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
    // 1. Fetch all Clients (FILTERED BY 'ATIVO' OR 'INATIVO - ROTA')
    // IMPORTANT: Requirement: "all customers where TIPO DE CLIENTE is either ATIVO or INATIVO - ROTA"
    const { data: clients, error: clientsError } = await supabase
      .from('CLIENTES')
      .select('*')
      .in('TIPO DE CLIENTE', ['ATIVO', 'INATIVO - ROTA'])
      .order('CODIGO', { ascending: false })
      .limit(50000)

    if (clientsError) throw clientsError
    if (!clients) return []

    // 2. Fetch Debts (Using Cobrança Service for consistency with History module)
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

    // 5. Fetch Projections
    const projectionMap = await this.getClientProjections()

    // 6. Fetch Accurate Stock Values via RPC
    const { data: stockData, error: stockError } = await supabase.rpc(
      'get_clients_last_stock_value',
    )
    if (stockError) {
      console.error('Error fetching stock values:', stockError)
    }

    const stockMap = new Map<number, number>()
    if (stockData) {
      ;(stockData as any[]).forEach((row) => {
        stockMap.set(row.client_id, row.stock_value)
      })
    }

    // 7. Fetch basic Summary Stats (History Dates)
    // We still fetch BANCO_DE_DADOS for lastDate and lastOrderId, history for completeness
    const { data: dbStats } = await supabase
      .from('BANCO_DE_DADOS')
      .select('"CÓDIGO DO CLIENTE", "DATA DO ACERTO", "NÚMERO DO PEDIDO"')
      .order('DATA DO ACERTO', { ascending: false })
      .limit(50000)

    const statsMap = new Map<
      number,
      {
        lastDate: string | null
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
        if (row['NÚMERO DO PEDIDO']) {
          entry.lastOrderId = row['NÚMERO DO PEDIDO']
        }
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
      const stockValue = stockMap.get(cid) || 0

      // Calculate Status & Earliest Unpaid Date
      let vencimentoStatus: 'VENCIDO' | 'A VENCER' | 'PAGO' | 'SEM DÉBITO' =
        'SEM DÉBITO'
      let earliestUnpaid: string | null = null

      if (debtInfo) {
        if (debtInfo.status === 'VENCIDO') {
          vencimentoStatus = 'VENCIDO'
          earliestUnpaid = debtInfo.oldestOverdueDate
        } else if (debtInfo.status === 'A VENCER') {
          vencimentoStatus = 'A VENCER'
          earliestUnpaid = debtInfo.earliestUnpaidDate
        } else {
          vencimentoStatus = 'SEM DÉBITO'
        }
      }

      return {
        rowNumber: index + 1,
        client,
        x_na_rota: rotaItem?.x_na_rota || 0,
        boleto: rotaItem?.boleto || false,
        agregado: rotaItem?.agregado || false,
        vendedor_id: rotaItem?.vendedor_id || null,
        debito: debtInfo?.totalDebt || 0, // Synced with cobrancaService logic
        quant_debito: debtInfo?.orderCount || 0,
        data_acerto: stats?.lastDate || null,
        projecao: projection,
        numero_pedido: stats?.lastOrderId || null,
        estoque: stockValue, // Updated to use RPC calculation
        has_pendency: pendencyMap.has(cid),
        is_completed: completedSet.has(cid),
        earliest_unpaid_date: earliestUnpaid,
        vencimento_status: vencimentoStatus,
      }
    })
  },

  async checkAndDecrementXNaRota(clientId: number, settlementDate: Date) {
    try {
      // 1. Get active Rota
      const activeRota = await this.getActiveRota()
      if (!activeRota) return

      // 2. Check if settlementDate is within Rota range
      const startDate = parseISO(activeRota.data_inicio)
      // For active rota, date must be >= start. No end date yet.
      // We startOfDay to avoid time issues if settlementDate is same day but earlier hour?
      // Usually settlementDate has no time in this context (coming from Acerto Page date picker)
      const checkDate = startOfDay(settlementDate)
      const start = startOfDay(startDate)

      if (isBefore(checkDate, start)) {
        return // Date is before rota start
      }

      // 3. Find Rota Item
      const { data: item, error: itemError } = await supabase
        .from('ROTA_ITEMS')
        .select('*')
        .eq('rota_id', activeRota.id)
        .eq('cliente_id', clientId)
        .maybeSingle()

      if (itemError) throw itemError
      if (!item) return

      // 4. Decrement
      const newX = (item.x_na_rota || 0) - 1

      await supabase
        .from('ROTA_ITEMS')
        .update({ x_na_rota: newX })
        .eq('id', item.id)
    } catch (error) {
      console.error('Error decrementing x_na_rota:', error)
    }
  },
}
