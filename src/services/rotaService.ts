import { supabase } from '@/lib/supabase/client'
import { Rota, RotaItem } from '@/types/rota'
import { pendenciasService } from './pendenciasService'
import { reportsService } from './reportsService'
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

  async getAllRotas() {
    const { data, error } = await supabase
      .from('ROTA')
      .select('*')
      .order('id', { ascending: false })

    if (error) throw error
    return data as Rota[]
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
    // 1. Fetch current active route details to determine completion status (Green/Red)
    const currentRota = await this.getActiveRota()
    if (!currentRota || currentRota.id !== currentRotaId) {
      throw new Error('Rota mismatch or no active route found.')
    }

    const fullData = await this.getFullRotaData(currentRota)

    // 2. Create new Route
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

    // 3. Prepare new items based on "Conditional Seller Persistence" logic
    const newItemsPayload = fullData
      .filter((row) => {
        // Only carry over rows that had relevant data or are active/in route
        return true
      })
      .map((row) => {
        // Default Logic:
        // If Green (Completed): Seller -> null, x_na_rota -> 0
        // If Red (Not Completed): Seller -> Persist
        let nextSellerId = row.vendedor_id
        let nextXNaRota = row.x_na_rota // Default: preserve current value

        if (row.is_completed) {
          nextSellerId = null
          nextXNaRota = 0 // Reset counter if settled
        } else {
          // New Requirement: If NOT completed AND has seller, increment x_na_rota
          if (nextSellerId) {
            nextXNaRota = (row.x_na_rota || 0) + 1
          }
        }

        // Apply "Proximo" override if exists
        // Note: Logic implies nextSellerId should be the one effective in new route.
        // If override exists, it becomes the new seller.
        if (row.proximo_vendedor_id) {
          nextSellerId = row.proximo_vendedor_id
          // Does assigning Proximo increment X?
          // If we follow Logic 4 (Trigger), Assigning Seller increments.
          // Since we are inserting here, and triggers work on UPDATE usually for our Logic 4 implementation,
          // we should handle increment here if appropriate.
          // However, User Story 5 says "identify all ROTA_ITEMS ... No Acerto ... vendedor_id is pre-filled ... must be incremented".
          // It refers to carrying over existing pending status.
          // New assignments via "Proximo" might logically reset or start at 1?
          // Let's assume standard carry over logic applies first, then override.
          // If override happens, it's a new assignment. New assignment usually implies 1st visit (x=1) or continuation?
          // If I assign a NEW seller, x should probably start counting for that seller? Or total visits?
          // Given ambiguity, stick strictly to Requirement 5 for "pending clients with assigned vendor".
          // If proximo is used, it overrides.
        }

        return {
          rota_id: nextId,
          cliente_id: row.client.CODIGO,
          vendedor_id: nextSellerId,
          x_na_rota: nextXNaRota,
          boleto: row.boleto,
          agregado: row.agregado,
          tarefas: row.tarefas,
          // vendedor_proximo_id is not carried over, it resets
        }
      })

    // 4. Batch Insert
    if (newItemsPayload.length > 0) {
      const { error: insertError } = await supabase
        .from('ROTA_ITEMS')
        .insert(newItemsPayload)

      if (insertError) {
        console.error('Error inserting new route items:', insertError)
        throw insertError
      }
    }

    // 5. Close old route
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
      .limit(50000)

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
      return data as RotaItem
    } else {
      const { data, error } = await supabase
        .from('ROTA_ITEMS')
        .insert(item)
        .select()
        .single()
      if (error) throw error
      return data as RotaItem
    }
  },

  async updateNextSeller(
    rotaId: number,
    clientId: number,
    nextSellerId: number | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    currentTarefas: string | null, // Deprecated param kept for signature compatibility if needed
  ) {
    // New logic: Update dedicated column
    return this.upsertRotaItem({
      rota_id: rotaId,
      cliente_id: clientId,
      vendedor_proximo_id: nextSellerId,
    })
  },

  async bulkUpdateNextSellers(
    rotaId: number,
    clientIds: number[],
    nextSellerId: number | null,
  ) {
    if (clientIds.length === 0) return

    // 1. Get existing items for these clients in this route
    const { data: existingItems, error: fetchError } = await supabase
      .from('ROTA_ITEMS')
      .select('id, cliente_id')
      .eq('rota_id', rotaId)
      .in('cliente_id', clientIds)

    if (fetchError) throw fetchError

    const existingClientIds = new Set(
      existingItems?.map((i) => i.cliente_id) || [],
    )

    const updates: number[] = []
    const inserts: any[] = []

    for (const clientId of clientIds) {
      if (existingClientIds.has(clientId)) {
        updates.push(clientId)
      } else {
        inserts.push({
          rota_id: rotaId,
          cliente_id: clientId,
          vendedor_proximo_id: nextSellerId,
        })
      }
    }

    const promises = []

    // Bulk Update existing
    if (updates.length > 0) {
      promises.push(
        supabase
          .from('ROTA_ITEMS')
          .update({ vendedor_proximo_id: nextSellerId })
          .eq('rota_id', rotaId)
          .in('cliente_id', updates),
      )
    }

    // Bulk Insert new
    if (inserts.length > 0) {
      // Chunking if necessary, but Supabase handles reasonably large batches
      const chunkSize = 1000
      for (let i = 0; i < inserts.length; i += chunkSize) {
        promises.push(
          supabase.from('ROTA_ITEMS').insert(inserts.slice(i, i + chunkSize)),
        )
      }
    }

    await Promise.all(promises)
  },

  async bulkClearNextSellers(rotaId: number) {
    // New logic: Clear column
    const { error } = await supabase
      .from('ROTA_ITEMS')
      .update({ vendedor_proximo_id: null })
      .eq('rota_id', rotaId)

    if (error) throw error
  },

  async bulkTransferNextSellers(rotaId: number) {
    const items = await this.getRotaItems(rotaId)
    const updates = []

    for (const item of items) {
      const nextSellerId = item.vendedor_proximo_id
      // Condition: No current seller assigned AND has a "Next Seller" set
      if (!item.vendedor_id && nextSellerId) {
        updates.push(
          this.upsertRotaItem({
            rota_id: rotaId,
            cliente_id: item.cliente_id,
            vendedor_id: nextSellerId,
            vendedor_proximo_id: null, // Clear after transfer
          }),
        )
      }
    }
    await Promise.all(updates)
  },

  async transferSingleNextSeller(
    rotaId: number,
    clientId: number,
    nextSellerId: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    currentTarefas: string | null,
  ) {
    return this.upsertRotaItem({
      rota_id: rotaId,
      cliente_id: clientId,
      vendedor_id: nextSellerId,
      vendedor_proximo_id: null,
    })
  },

  async getFullRotaData(rota: Rota | null) {
    // 1. Fetch all Clients
    const { data: clients, error: clientsError } = await supabase
      .from('CLIENTES')
      .select('*')
      .in('TIPO DE CLIENTE', ['ATIVO', 'INATIVO - ROTA'])
      .order('CODIGO', { ascending: false })
      .limit(100000)

    if (clientsError) throw clientsError
    if (!clients) return []

    // Helper to safely run promises
    const safeFetch = async <T>(
      promise: Promise<T>,
      fallback: T,
      name: string,
    ): Promise<T> => {
      try {
        return await promise
      } catch (e) {
        console.warn(`Failed to fetch ${name}, using fallback.`, e)
        return fallback
      }
    }

    const [
      debtData,
      allPendencies,
      rotaItems,
      projectionsReport,
      statsData,
      consignedData,
    ] = await Promise.all([
      safeFetch(
        supabase
          .from('debitos_historico')
          .select('cliente_codigo, debito, data_acerto, pedido_id')
          .limit(100000)
          .then(({ data, error }) => {
            if (error) throw error
            return data
          }),
        [],
        'debts',
      ),
      safeFetch(pendenciasService.getAll(false), [], 'pendencies'),
      rota
        ? safeFetch(this.getRotaItems(rota.id), [], 'rotaItems')
        : Promise.resolve([]),
      safeFetch(reportsService.getProjectionsReport(), [], 'projections'),
      safeFetch(
        supabase
          .from('client_stats_view' as any)
          .select('client_id, max_pedido, max_data_acerto')
          .limit(100000)
          .then(({ data, error }) => {
            if (error) throw error
            return data
          }),
        [],
        'stats',
      ),
      safeFetch(
        supabase
          .from('view_client_latest_consigned_value' as any)
          .select('*')
          .limit(100000)
          .then(({ data, error }) => {
            if (error) throw error
            return data
          }),
        [],
        'consigned',
      ),
    ])

    // Process Debts
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

    // Process Pendencies
    const pendencyMap = new Map<number, string[]>()
    allPendencies.forEach((p) => {
      const existing = pendencyMap.get(p.cliente_id) || []
      existing.push(p.descricao_pendencia)
      pendencyMap.set(p.cliente_id, existing)
    })

    // Process Rota Items
    const rotaItemsMap = new Map<number, RotaItem>()
    rotaItems.forEach((i) => rotaItemsMap.set(i.cliente_id, i))

    // Process Projections
    const orderProjectionMap = new Map<number, number>()
    projectionsReport.forEach((p) => {
      if (p.projection !== null) {
        orderProjectionMap.set(p.orderId, p.projection)
      }
    })

    // Process Stats
    const statsMap = new Map<
      number,
      { lastDate: string | null; lastOrderId: number | null }
    >()

    statsData?.forEach((row: any) => {
      const cid = row.client_id
      if (!cid) return
      statsMap.set(cid, {
        lastDate: row.max_data_acerto || null,
        lastOrderId: row.max_pedido || null,
      })
    })

    // Process Consigned
    const consignedMap = new Map<number, number>()
    if (consignedData) {
      consignedData.forEach((row: any) => {
        consignedMap.set(row.client_id, row.total_consigned_value)
      })
    }

    // Oldest Unpaid Date Fetching
    const clientOldestDueMap = new Map<number, string>()
    const ordersWithDebtArray = Array.from(ordersWithDebt)
    const orderExplicitDateMap = new Map<number, string>()
    const ordersWithExplicitDates = new Set<number>()

    if (ordersWithDebtArray.length > 0) {
      const chunkSize = 1000
      for (let i = 0; i < ordersWithDebtArray.length; i += chunkSize) {
        const chunk = ordersWithDebtArray.slice(i, i + chunkSize)

        await Promise.all([
          safeFetch(
            supabase
              .from('acoes_cobranca')
              .select(
                'pedido_id, acoes_cobranca_vencimentos(vencimento, valor, id)',
              )
              .in('pedido_id', chunk)
              .then(({ data }) => {
                data?.forEach((action: any) => {
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
              }),
            null,
            'collection actions',
          ),
          safeFetch(
            supabase
              .from('RECEBIMENTOS')
              .select('venda_id, vencimento, valor_pago, valor_registrado')
              .in('venda_id', chunk)
              .gt('valor_registrado', 0)
              .then(({ data }) => {
                if (data) {
                  const unpaidRecs = data.filter(
                    (r: any) => (r.valor_pago || 0) < (r.valor_registrado || 0),
                  )
                  const recDatesByOrder = new Map<number, string[]>()
                  unpaidRecs.forEach((r: any) => {
                    const pid = r.venda_id
                    if (pid && r.vencimento) {
                      if (!recDatesByOrder.has(pid))
                        recDatesByOrder.set(pid, [])
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
              }),
            null,
            'receivables',
          ),
        ])
      }
    }

    ordersWithDebtArray.forEach((pid) => {
      const info = orderDataMap.get(pid)
      if (!info) return
      let date = orderExplicitDateMap.get(pid)
      if (!date && info.dataAcerto) date = info.dataAcerto
      if (date) {
        const currentMin = clientOldestDueMap.get(info.clientId)
        if (!currentMin || date < currentMin) {
          clientOldestDueMap.set(info.clientId, date)
        }
      }
    })

    const completedSet = new Set<number>()
    if (rota) {
      const startDate = rota.data_inicio
      const endDate = rota.data_fim || new Date().toISOString()

      await Promise.all([
        safeFetch(
          supabase
            .from('BANCO_DE_DADOS')
            .select('"CÓDIGO DO CLIENTE"')
            .gte('"DATA E HORA"', startDate)
            .limit(50000)
            .then(({ data }) => {
              data?.forEach((v) => {
                const cid = v['CÓDIGO DO CLIENTE']
                if (cid) completedSet.add(cid)
              })
            }),
          null,
          'completed visits',
        ),
        safeFetch(
          supabase
            .from('RECEBIMENTOS')
            .select('cliente_id')
            .gte('created_at', startDate)
            .lte('created_at', endDate)
            .limit(50000)
            .then(({ data }) => {
              data?.forEach((p) => {
                if (p.cliente_id) completedSet.add(p.cliente_id)
              })
            }),
          null,
          'completed payments',
        ),
      ])
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

      let vencimentoStatus: 'VENCIDO' | 'A VENCER' | 'PAGO' | 'SEM DÉBITO' =
        'SEM DÉBITO'
      const oldestDue = clientOldestDueMap.get(cid)
      const effectiveDebt = debtEntry?.totalDebt || 0

      if (effectiveDebt > 0.05) {
        if (oldestDue) {
          const dueDate = parseISO(oldestDue)
          if (isBefore(dueDate, today)) {
            vencimentoStatus = 'VENCIDO'
          } else {
            vencimentoStatus = 'A VENCER'
          }
        } else if (debtEntry?.oldestDate) {
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

      // Use column directly
      const nextSellerId = rotaItem?.vendedor_proximo_id || null

      return {
        rowNumber: index + 1,
        client,
        x_na_rota: rotaItem?.x_na_rota || 0,
        boleto: rotaItem?.boleto || false,
        agregado: rotaItem?.agregado || false,
        vendedor_id: rotaItem?.vendedor_id || null,
        proximo_vendedor_id: nextSellerId,
        tarefas: rotaItem?.tarefas || null,
        debito: effectiveDebt,
        quant_debito: debtEntry?.orderCount || 0,
        data_acerto: stats?.lastDate || null,
        projecao: projection,
        numero_pedido: stats?.lastOrderId || null,
        estoque: stockValue,
        valor_consignado: consignedMap.get(cid) || null,
        has_pendency: pendencyMap.has(cid),
        pendency_details: pendencyMap.get(cid) || [],
        is_completed: isCompleted,
        earliest_unpaid_date: oldestDue || debtEntry?.oldestDate || null,
        vencimento_status: vencimentoStatus,
        vencimento_cobranca: oldestDue || null,
      }
    })
  },

  async checkAndDecrementXNaRota() {
    // Logic handled by DB triggers/transfers
  },
}
