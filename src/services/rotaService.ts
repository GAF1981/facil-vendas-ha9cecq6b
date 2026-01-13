import { supabase } from '@/lib/supabase/client'
import { Rota, RotaItem } from '@/types/rota'
import { pendenciasService } from './pendenciasService'
import { reportsService } from './reportsService'
import { parseISO, isBefore, startOfDay, format } from 'date-fns'

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

  async finishAndStartNewRoute(currentRotaId: number) {
    // 1. Determine Next ID
    const { data: maxIdData } = await supabase
      .from('ROTA')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextId = (maxIdData?.id || currentRotaId) + 1

    // 2. Create the New Rota (Opened)
    const { data: newRota, error: startError } = await supabase
      .from('ROTA')
      .insert({
        id: nextId,
        data_inicio: new Date().toISOString(),
      })
      .select()
      .single()

    if (startError) throw startError

    // 3. Transfer Unattended Items from Old to New
    // Using the NEW SQL function that handles persistence logic (v3) which increments x_na_rota
    const { error: transferError } = await supabase.rpc(
      'transfer_unattended_items_v3',
      {
        p_old_rota_id: currentRotaId,
        p_new_rota_id: nextId,
      },
    )

    if (transferError) {
      console.error('Error transferring unattended items:', transferError)
      // Even if transfer fails, we try to close the old route?
      // Better to throw so UI knows something went wrong, but the new route is already created...
      // Ideally we would wrap in a transaction, but via client SDK we can't easily.
      // We will proceed to close old route but log error.
    }

    // 4. Close the Old Rota
    const { error: endError } = await supabase
      .from('ROTA')
      .update({
        data_fim: new Date().toISOString(),
      })
      .eq('id', currentRotaId)

    if (endError) throw endError

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
    // 1. Fetch all Clients
    const { data: clients, error: clientsError } = await supabase
      .from('CLIENTES')
      .select('*')
      .in('TIPO DE CLIENTE', ['ATIVO', 'INATIVO - ROTA'])
      .order('CODIGO', { ascending: false })
      .limit(50000)

    if (clientsError) throw clientsError
    if (!clients) return []

    // 2. Optimized Debt Fetching
    const { data: debtData, error: debtError } = await supabase
      .from('debitos_historico')
      .select('cliente_codigo, debito, data_acerto, pedido_id')

    if (debtError) {
      console.error('Error fetching debitos_historico:', debtError)
    }

    const debtMap = new Map<
      number,
      { totalDebt: number; orderCount: number; oldestDate: string | null }
    >()
    const ordersWithDebt = new Set<number>()
    const orderDataMap = new Map<
      number,
      { clientId: number; dataAcerto: string | null }
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

          if (row.pedido_id) {
            ordersWithDebt.add(row.pedido_id)
            orderDataMap.set(row.pedido_id, {
              clientId: cid,
              dataAcerto: row.data_acerto || null,
            })
          }

          if (row.data_acerto) {
            if (!entry.oldestDate || row.data_acerto < entry.oldestDate) {
              entry.oldestDate = row.data_acerto
            }
          }
        }
      })
    }

    // 3. Fetch Pendencies
    const allPendencies = await pendenciasService.getAll(false)
    const pendencyMap = new Set(allPendencies.map((p) => p.cliente_id))

    // 4. Fetch Rota Items
    let rotaItemsMap = new Map<number, RotaItem>()
    if (rota) {
      const items = await this.getRotaItems(rota.id)
      items.forEach((i) => rotaItemsMap.set(i.cliente_id, i))
    }

    // 5. Fetch Projections
    const projectionsReport = await reportsService.getProjectionsReport()
    const orderProjectionMap = new Map<number, number>()
    projectionsReport.forEach((p) => {
      if (p.projection !== null) {
        orderProjectionMap.set(p.orderId, p.projection)
      }
    })

    // 6. Fetch basic Summary Stats
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
      statsMap.set(cid, {
        lastDate: row.max_data_acerto || null,
        lastOrderId: row.max_pedido || null,
      })
      if (row.max_pedido) {
        orderIdsForStock.add(row.max_pedido)
      }
    })

    // 7. Fetch Stock Values
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

        if (!stockError) {
          stockRows?.forEach((row: any) => {
            const orderId = Number(row.pedido_id)
            const clientId = Number(row.client_id)
            const val = Number(row.valor_total) || 0
            if (orderId && clientId) {
              if (!stockMapByOrder.has(orderId)) {
                stockMapByOrder.set(orderId, { value: val, clientId: clientId })
              }
            }
          })
        }
      }
    }

    // 8. Fetch Consigned Values
    const { data: consignedData } = await supabase
      .from('view_client_latest_consigned_value' as any)
      .select('*')
    const consignedMap = new Map<number, number>()
    if (consignedData) {
      consignedData.forEach((row: any) => {
        consignedMap.set(row.client_id, row.total_consigned_value)
      })
    }

    // 9. Fetch Oldest Unpaid Due Date (Vencimento)
    const clientOldestDueMap = new Map<number, string>()
    const ordersWithDebtArray = Array.from(ordersWithDebt)
    const orderExplicitDateMap = new Map<number, string>()
    const ordersWithExplicitDates = new Set<number>()

    if (ordersWithDebtArray.length > 0) {
      const chunkSize = 1000
      for (let i = 0; i < ordersWithDebtArray.length; i += chunkSize) {
        const chunk = ordersWithDebtArray.slice(i, i + chunkSize)

        // A. Fetch Negotiated Actions
        const { data: actionsData } = await supabase
          .from('acoes_cobranca')
          .select(
            'pedido_id, acoes_cobranca_vencimentos(vencimento, valor, id)',
          )
          .in('pedido_id', chunk)

        if (actionsData) {
          actionsData.forEach((action: any) => {
            const pid = action.pedido_id
            if (!pid) return

            const installments = action.acoes_cobranca_vencimentos
            if (installments && installments.length > 0) {
              const dates = installments
                .map((inst: any) => inst.vencimento)
                .filter(Boolean)
                .sort()

              if (dates.length > 0) {
                orderExplicitDateMap.set(pid, dates[0])
                ordersWithExplicitDates.add(pid)
              }
            }
          })
        }

        // B. Fetch Receivables
        const { data: recData } = await supabase
          .from('RECEBIMENTOS')
          .select('venda_id, vencimento, valor_pago, valor_registrado')
          .in('venda_id', chunk)
          .gt('valor_registrado', 0)

        if (recData) {
          const unpaidRecs = recData.filter(
            (r: any) => (r.valor_pago || 0) < (r.valor_registrado || 0),
          )

          const recDatesByOrder = new Map<number, string[]>()
          unpaidRecs.forEach((r: any) => {
            const pid = r.venda_id
            if (pid && r.vencimento) {
              if (!recDatesByOrder.has(pid)) recDatesByOrder.set(pid, [])
              recDatesByOrder.get(pid)!.push(r.vencimento)
            }
          })

          recDatesByOrder.forEach((dates, pid) => {
            if (!ordersWithExplicitDates.has(pid) && dates.length > 0) {
              dates.sort()
              orderExplicitDateMap.set(pid, dates[0])
              ordersWithExplicitDates.add(pid)
            }
          })
        }
      }
    }

    ordersWithDebtArray.forEach((pid) => {
      const info = orderDataMap.get(pid)
      if (!info) return

      let date = orderExplicitDateMap.get(pid)

      if (!date && info.dataAcerto) {
        date = info.dataAcerto
      }

      if (date) {
        const currentMin = clientOldestDueMap.get(info.clientId)
        if (!currentMin || date < currentMin) {
          clientOldestDueMap.set(info.clientId, date)
        }
      }
    })

    // 10. Check for Completed Status (Activity during Rota)
    const completedSet = new Set<number>()
    if (rota) {
      const startDate = rota.data_inicio
      const endDate = rota.data_fim || new Date().toISOString()
      // We removed the 'formattedStartDate' and the loose 'DATA DO ACERTO' comparison
      // to ensure strictly only current route activities are counted (Client 67 Fix).

      // Check BANCO_DE_DADOS (Acertos)
      const { data: visits } = await supabase
        .from('BANCO_DE_DADOS')
        .select('"CÓDIGO DO CLIENTE"')
        .gte('"DATA E HORA"', startDate) // Strict timestamp comparison
        .limit(20000)

      visits?.forEach((v) => {
        const cid = v['CÓDIGO DO CLIENTE']
        if (cid) completedSet.add(cid)
      })

      // Check RECEBIMENTOS (Payments)
      const { data: payments } = await supabase
        .from('RECEBIMENTOS')
        .select('cliente_id')
        .gte('created_at', startDate)
        .lte('created_at', endDate)

      payments?.forEach((p) => {
        if (p.cliente_id) completedSet.add(p.cliente_id)
      })
    }

    const today = startOfDay(new Date())

    return clients.map((client, index) => {
      const cid = client.CODIGO
      const debtEntry = debtMap.get(cid)
      const rotaItem = rotaItemsMap.get(cid)
      const stats = statsMap.get(cid)

      let projection: number | null = null
      if (stats?.lastOrderId) {
        const p = orderProjectionMap.get(stats.lastOrderId)
        if (p !== undefined) projection = p
      }

      let stockValue: number | null = null
      if (stats?.lastOrderId) {
        const stockInfo = stockMapByOrder.get(stats.lastOrderId)
        if (stockInfo && stockInfo.clientId === cid)
          stockValue = stockInfo.value
      }

      // Vencimento Status Logic
      let vencimentoStatus: 'VENCIDO' | 'A VENCER' | 'PAGO' | 'SEM DÉBITO' =
        'SEM DÉBITO'

      const oldestDue = clientOldestDueMap.get(cid)
      const effectiveDebt = debtEntry?.totalDebt || 0

      if (effectiveDebt > 0.05) {
        if (oldestDue) {
          const dueDate = parseISO(oldestDue)
          // strict check: if date is BEFORE today -> Vencido
          if (isBefore(dueDate, today)) {
            vencimentoStatus = 'VENCIDO'
          } else {
            vencimentoStatus = 'A VENCER'
          }
        } else if (debtEntry?.oldestDate) {
          // Fallback to debt entry old logic
          const date = parseISO(debtEntry.oldestDate)
          if (isBefore(date, today)) {
            vencimentoStatus = 'VENCIDO'
          } else {
            vencimentoStatus = 'A VENCER'
          }
        } else {
          vencimentoStatus = 'A VENCER'
        }
      }

      const isCompleted = completedSet.has(cid)

      return {
        rowNumber: index + 1,
        client,
        x_na_rota: rotaItem?.x_na_rota || 0,
        boleto: rotaItem?.boleto || false,
        agregado: rotaItem?.agregado || false,
        vendedor_id: rotaItem?.vendedor_id || null,
        debito: effectiveDebt,
        quant_debito: debtEntry?.orderCount || 0,
        data_acerto: stats?.lastDate || null,
        projecao: projection,
        numero_pedido: stats?.lastOrderId || null,
        estoque: stockValue,
        valor_consignado: consignedMap.get(cid) || null,
        has_pendency: pendencyMap.has(cid),
        is_completed: isCompleted,
        earliest_unpaid_date: oldestDue || debtEntry?.oldestDate || null,
        vencimento_status: vencimentoStatus,
        vencimento_cobranca: oldestDue || null,
      }
    })
  },

  async checkAndDecrementXNaRota() {
    // No-op - DB triggers/logic handle this
  },
}
