import { supabase } from '@/lib/supabase/client'
import { Rota, RotaItem } from '@/types/rota'
import { pendenciasService } from './pendenciasService'
import { reportsService } from './reportsService'
import { parseISO, isBefore, startOfDay, subDays, format } from 'date-fns'

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
    const { error: rpcError } = await supabase.rpc(
      'increment_rota_items_on_finalize',
      { p_rota_id: currentRotaId },
    )

    if (rpcError) {
      console.error('Error auto-incrementing x_na_rota:', rpcError)
    }

    const { error: endError } = await supabase
      .from('ROTA')
      .update({
        data_fim: new Date().toISOString(),
      })
      .eq('id', currentRotaId)

    if (endError) throw endError

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

  async getFullRotaData(rota: Rota | null) {
    // 1. Fetch all Clients (FILTERED BY 'ATIVO' OR 'INATIVO - ROTA')
    const { data: clients, error: clientsError } = await supabase
      .from('CLIENTES')
      .select('*')
      .in('TIPO DE CLIENTE', ['ATIVO', 'INATIVO - ROTA'])
      .order('CODIGO', { ascending: false })
      .limit(50000)

    if (clientsError) throw clientsError
    if (!clients) return []

    // 2. Optimized Debt Fetching using debitos_historico (Source of Truth)
    const { data: debtData, error: debtError } = await supabase
      .from('debitos_historico')
      .select('cliente_codigo, debito, data_acerto')

    if (debtError) {
      console.error('Error fetching debitos_historico:', debtError)
    }

    const debtMap = new Map<
      number,
      { totalDebt: number; orderCount: number; oldestDate: string | null }
    >()

    if (debtData) {
      debtData.forEach((row) => {
        const cid = row.cliente_codigo
        if (!cid) return

        if (!debtMap.has(cid)) {
          debtMap.set(cid, {
            totalDebt: 0,
            orderCount: 0,
            oldestDate: null,
          })
        }
        const entry = debtMap.get(cid)!
        const val = row.debito || 0

        entry.totalDebt += val

        if (val > 0.01) {
          entry.orderCount += 1

          if (row.data_acerto) {
            if (!entry.oldestDate || row.data_acerto < entry.oldestDate) {
              entry.oldestDate = row.data_acerto
            }
          }
        }
      })
    }

    // 3. Fetch Pendencies
    const allPendencies = await pendenciasService.getAll(false) // Unresolved
    const pendencyMap = new Set(allPendencies.map((p) => p.cliente_id))

    // 4. Fetch Rota Items
    let rotaItemsMap = new Map<number, RotaItem>()
    if (rota) {
      const items = await this.getRotaItems(rota.id)
      items.forEach((i) => rotaItemsMap.set(i.cliente_id, i))
    }

    // 5. Fetch Projections via Reports Service (Linked by Order Number)
    const projectionsReport = await reportsService.getProjectionsReport()
    const orderProjectionMap = new Map<number, number>()
    projectionsReport.forEach((p) => {
      if (p.projection !== null) {
        orderProjectionMap.set(p.orderId, p.projection)
      }
    })

    // 6. Fetch basic Summary Stats (Max Order ID and Last Date from View)
    // Fetching from view for accurate MAX Order ID per client
    const { data: statsData, error: statsError } = await supabase
      .from('client_stats_view' as any)
      .select('client_id, max_pedido, max_data_acerto')
      .limit(50000)

    if (statsError) {
      console.error('Error fetching client stats view:', statsError)
    }

    const statsMap = new Map<
      number,
      {
        lastDate: string | null
        lastOrderId: number | null
      }
    >()

    const orderIdsForStock = new Set<number>()

    statsData?.forEach((row: any) => {
      const cid = row.client_id
      if (!cid) return

      // Map using the aggregated data
      statsMap.set(cid, {
        lastDate: row.max_data_acerto || null,
        lastOrderId: row.max_pedido || null,
      })

      if (row.max_pedido) {
        orderIdsForStock.add(row.max_pedido)
      }
    })

    // 7. Fetch Stock Values from QUANTIDADE DE ESTOQUE FINAL based on collected Orders (MAX Orders)
    const stockMapByOrder = new Map<
      number,
      { value: number; clientId: number }
    >()
    const orderIdsArray = Array.from(orderIdsForStock)

    if (orderIdsArray.length > 0) {
      const chunkSize = 1000
      for (let i = 0; i < orderIdsArray.length; i += chunkSize) {
        const chunk = orderIdsArray.slice(i, i + chunkSize)

        const { data: stockRows, error: stockError } = await supabase
          .from('QUANTIDADE DE ESTOQUE FINAL')
          .select(
            'pedido_id:"NUMERO DO PEDIDO", client_id:"CÓDIGO DO CLIENTE", valor_total:"VALOR ESTOQUE SALDO FINAL"',
          )
          .in('"NUMERO DO PEDIDO"', chunk)

        if (stockError) {
          console.error(
            'Error fetching stock from QUANTIDADE DE ESTOQUE FINAL:',
            stockError,
          )
          continue
        }

        stockRows?.forEach((row: any) => {
          const orderId = Number(row.pedido_id)
          const clientId = Number(row.client_id)
          const val = Number(row.valor_total) || 0

          if (!orderId || !clientId) return

          if (!stockMapByOrder.has(orderId)) {
            stockMapByOrder.set(orderId, {
              value: val,
              clientId: clientId,
            })
          }
        })
      }
    }

    // 8. Fetch Consigned Values (New Requirement)
    const { data: consignedData, error: consignedError } = await supabase
      .from('view_client_latest_consigned_value' as any)
      .select('*')

    if (consignedError) {
      console.error('Error fetching consigned values:', consignedError)
    }

    const consignedMap = new Map<number, number>()
    if (consignedData) {
      consignedData.forEach((row: any) => {
        consignedMap.set(row.client_id, row.total_consigned_value)
      })
    }

    // 9. Fetch Collection Action Maturity Dates (For "Vencimento" column in Rota)
    // Only fetching installment_vencimento
    const { data: collectionData, error: collectionError } = await supabase
      .from('view_latest_collection_actions' as any)
      .select('cliente_id, installment_vencimento')

    if (collectionError) {
      console.error('Error fetching collection actions:', collectionError)
    }

    const collectionDateMap = new Map<number, string>()
    if (collectionData) {
      collectionData.forEach((row: any) => {
        const cid = row.cliente_id
        const vDate = row.installment_vencimento
        if (!cid || !vDate) return

        // We want the oldest date (minimum value) per client
        if (!collectionDateMap.has(cid)) {
          collectionDateMap.set(cid, vDate)
        } else {
          const current = collectionDateMap.get(cid)!
          if (vDate < current) {
            collectionDateMap.set(cid, vDate)
          }
        }
      })
    }

    // 10. Check for Completed Status (Visits within active route range)
    const completedSet = new Set<number>()
    if (rota) {
      const startDate = format(parseISO(rota.data_inicio), 'yyyy-MM-dd')
      // If data_fim is null (active), use today as end range to capture all recent visits
      const endDate = rota.data_fim
        ? format(parseISO(rota.data_fim), 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd')

      const { data: visits, error: visitsError } = await supabase
        .from('BANCO_DE_DADOS')
        .select('"CÓDIGO DO CLIENTE"')
        .gte('DATA DO ACERTO', startDate)
        .lte('DATA DO ACERTO', endDate)
        .limit(20000)

      if (visitsError) {
        console.error(
          'Error fetching visits for completion check:',
          visitsError,
        )
      }

      visits?.forEach((v) => {
        const cid = v['CÓDIGO DO CLIENTE']
        if (cid) completedSet.add(cid)
      })
    }

    const today = startOfDay(new Date())

    return clients.map((client, index) => {
      const cid = client.CODIGO
      const debtEntry = debtMap.get(cid)
      const rotaItem = rotaItemsMap.get(cid)
      const stats = statsMap.get(cid)

      // Projection linked by Order ID
      let projection: number | null = null
      if (stats?.lastOrderId) {
        const p = orderProjectionMap.get(stats.lastOrderId)
        if (p !== undefined) {
          projection = p
        }
      }

      // Stock Value linked by Order ID (with Client ID verification)
      let stockValue: number | null = null
      if (stats?.lastOrderId) {
        const stockInfo = stockMapByOrder.get(stats.lastOrderId)
        // Ensure the stock record found actually belongs to this client
        if (stockInfo && stockInfo.clientId === cid) {
          stockValue = stockInfo.value
        }
      }

      // Calculate Status & Earliest Unpaid Date
      let vencimentoStatus: 'VENCIDO' | 'A VENCER' | 'PAGO' | 'SEM DÉBITO' =
        'SEM DÉBITO'
      let earliestUnpaid: string | null = null

      if (debtEntry && debtEntry.totalDebt > 0.05) {
        earliestUnpaid = debtEntry.oldestDate
        if (debtEntry.oldestDate) {
          const date = parseISO(debtEntry.oldestDate)
          if (isBefore(date, subDays(today, 30))) {
            vencimentoStatus = 'VENCIDO'
          } else {
            vencimentoStatus = 'A VENCER'
          }
        } else {
          vencimentoStatus = 'A VENCER'
        }
      }

      return {
        rowNumber: index + 1,
        client,
        x_na_rota: rotaItem?.x_na_rota || 0,
        boleto: rotaItem?.boleto || false,
        agregado: rotaItem?.agregado || false,
        vendedor_id: rotaItem?.vendedor_id || null,
        debito: debtEntry?.totalDebt || 0,
        quant_debito: debtEntry?.orderCount || 0,
        data_acerto: stats?.lastDate || null,
        projecao: projection,
        numero_pedido: stats?.lastOrderId || null,
        estoque: stockValue, // Now nullable
        valor_consignado: consignedMap.get(cid) || null, // Map from view
        has_pendency: pendencyMap.has(cid),
        is_completed: completedSet.has(cid),
        earliest_unpaid_date: earliestUnpaid,
        vencimento_status: vencimentoStatus,
        vencimento_cobranca: collectionDateMap.get(cid) || null,
      }
    })
  },

  async checkAndDecrementXNaRota(clientId: number, settlementDate: Date) {
    try {
      const activeRota = await this.getActiveRota()
      if (!activeRota) return

      const startDate = parseISO(activeRota.data_inicio)
      const checkDate = startOfDay(settlementDate)
      const start = startOfDay(startDate)

      if (isBefore(checkDate, start)) {
        return
      }

      const { data: item, error: itemError } = await supabase
        .from('ROTA_ITEMS')
        .select('*')
        .eq('rota_id', activeRota.id)
        .eq('cliente_id', clientId)
        .maybeSingle()

      if (itemError) throw itemError
      if (!item) return

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
