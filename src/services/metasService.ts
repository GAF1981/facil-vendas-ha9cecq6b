import { supabase } from '@/lib/supabase/client'
import { MetaFuncionario, MetaPeriodo } from '@/types/meta'

export const metasService = {
  async getMeta(funcionarioId: number): Promise<MetaFuncionario | null> {
    const { data, error } = await supabase
      .from('metas_funcionarios' as any)
      .select('*')
      .eq('funcionario_id', funcionarioId)
      .maybeSingle()

    if (error) throw error
    return data as MetaFuncionario | null
  },

  async upsertMeta(funcionarioId: number, metaDiaria: number) {
    const { error } = await supabase
      .from('metas_funcionarios' as any)
      .upsert(
        { funcionario_id: funcionarioId, meta_diaria: metaDiaria },
        { onConflict: 'funcionario_id' },
      )

    if (error) throw error
  },

  async getMetasPeriodos(funcionarioId: number): Promise<MetaPeriodo[]> {
    const { data, error } = await supabase
      .from('metas_periodos' as any)
      .select('*')
      .eq('funcionario_id', funcionarioId)
      .order('data_inicio', { ascending: false })

    if (error) throw error
    return data as MetaPeriodo[]
  },

  async addMetaPeriodo(
    funcionarioId: number,
    dataInicio: string,
    dataFim: string,
    valorMeta: number,
  ) {
    const { error } = await supabase.from('metas_periodos' as any).insert({
      funcionario_id: funcionarioId,
      data_inicio: dataInicio,
      data_fim: dataFim,
      valor_meta: valorMeta,
    })

    if (error) throw error
  },

  async deleteMetaPeriodo(id: number) {
    const { error } = await supabase
      .from('metas_periodos' as any)
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  async getExceptionDays() {
    const { data, error } = await supabase
      .from('meta_excecoes' as any)
      .select('*, FUNCIONARIOS(nome_completo)')
      .order('data_inicio')
    if (error) throw error
    return data || []
  },

  async addExceptionDay(
    data_inicio: string,
    data_fim: string,
    descricao: string,
    funcionario_id?: number | null,
  ) {
    const payload: any = { data_inicio, data_fim, descricao }
    if (funcionario_id) {
      payload.funcionario_id = funcionario_id
    }
    const { error } = await supabase
      .from('meta_excecoes' as any)
      .insert(payload)
    if (error) throw error
  },

  async deleteExceptionDay(id: number) {
    const { error } = await supabase
      .from('meta_excecoes' as any)
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async getAcertos(funcionarioId: number, startStr: string, endStr: string) {
    const { data: empData } = await supabase
      .from('FUNCIONARIOS')
      .select('nome_completo')
      .eq('id', funcionarioId)
      .single()

    const firstName = empData?.nome_completo
      ? empData.nome_completo.split(' ')[0]
      : ''

    let dbData: any[] = []
    let hasMore = true
    let offset = 0
    const limit = 1000

    while (hasMore) {
      let query = supabase
        .from('BANCO_DE_DADOS')
        .select(
          '"NÚMERO DO PEDIDO", "CÓDIGO DO CLIENTE", "DATA DO ACERTO", "DATA E HORA", "HORA DO ACERTO", "CODIGO FUNCIONARIO", "FUNCIONÁRIO", "FORMA"',
        )

      if (firstName) {
        query = query.or(
          `CODIGO FUNCIONARIO.eq.${funcionarioId},FUNCIONÁRIO.ilike.%${firstName}%`,
        )
      } else {
        query = query.eq('CODIGO FUNCIONARIO', funcionarioId)
      }

      const { data, error } = await query.range(offset, offset + limit - 1)
      if (error) throw error
      if (data && data.length > 0) {
        dbData = dbData.concat(data)
        offset += limit
        if (data.length < limit) hasMore = false
      } else {
        hasMore = false
      }
    }

    const orderIds = Array.from(
      new Set(dbData.map((r: any) => r['NÚMERO DO PEDIDO']).filter(Boolean)),
    )

    const paymentsMap = new Map<number, any[]>()
    if (orderIds.length > 0) {
      const chunkSize = 1000
      for (let i = 0; i < orderIds.length; i += chunkSize) {
        const chunk = orderIds.slice(i, i + chunkSize)
        const { data: payData } = await supabase
          .from('RECEBIMENTOS')
          .select('venda_id, forma_pagamento')
          .in('venda_id', chunk)

        payData?.forEach((p) => {
          if (!paymentsMap.has(p.venda_id)) paymentsMap.set(p.venda_id, [])
          paymentsMap.get(p.venda_id)!.push(p)
        })
      }
    }

    const regularMap = new Map<string, number>()
    const captacaoMap = new Map<string, number>()
    const processedOrders = new Set<string>()

    const getValidDateStr = (val: string) => {
      if (!val) return null
      let d = val.trim()
      if (d.includes('T')) d = d.split('T')[0]
      if (d.includes(' ')) d = d.split(' ')[0]
      if (d.includes('/')) {
        const parts = d.split('/')
        if (parts.length === 3) {
          const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2]
          const m = parts[1].padStart(2, '0')
          const day = parts[0].padStart(2, '0')
          return `${y}-${m}-${day}`
        }
      }
      if (d.match(/^\d{4}-\d{2}-\d{2}$/)) return d
      return null
    }

    const normalizeName = (name: string | null | undefined) => {
      if (!name) return ''
      return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/souza/g, 'sousa')
        .replace(/\s+/g, ' ')
        .trim()
    }

    const normSelected = normalizeName(empData?.nome_completo)

    dbData.forEach((row: any) => {
      const funcCode = row['CODIGO FUNCIONARIO']?.toString()
      const fName = row['FUNCIONÁRIO'] || ''
      const normDb = normalizeName(fName)

      let isMatch = false
      if (funcCode && funcCode === funcionarioId.toString()) {
        isMatch = true
      } else if (normDb) {
        if (normDb === normSelected) {
          isMatch = true
        } else {
          const partsSelected = normSelected.split(' ')
          const firstS = partsSelected[0]
          const lastS =
            partsSelected.length > 1
              ? partsSelected[partsSelected.length - 1]
              : ''
          if (
            firstS &&
            lastS &&
            normDb.includes(firstS) &&
            normDb.includes(lastS)
          ) {
            isMatch = true
          } else if (partsSelected.length === 1 && normDb.includes(firstS)) {
            isMatch = true
          }
        }
      }

      if (!isMatch) return

      let rawDate = row['DATA DO ACERTO'] || row['DATA E HORA']
      const dateStr = getValidDateStr(rawDate)

      if (!dateStr || dateStr < startStr || dateStr > endStr) return

      const orderId = row['NÚMERO DO PEDIDO']
      const clientId = row['CÓDIGO DO CLIENTE']

      let uniqueKey = ''
      if (orderId) {
        uniqueKey = `order-${orderId}`
      } else {
        uniqueKey = `fallback-${dateStr}-${clientId || 'noclient'}-${
          row['HORA DO ACERTO'] || 'notime'
        }`
      }

      if (processedOrders.has(uniqueKey)) return
      processedOrders.add(uniqueKey)

      const formBd = (row['FORMA'] || '').toLowerCase()
      let isCaptacao = false
      let hasRegular = false

      const forms = formBd
        .split('|')
        .map((f: string) => f.trim())
        .filter(Boolean)

      if (forms.length > 0) {
        forms.forEach((f: string) => {
          if (f.includes('captação') || f.includes('captacao')) {
            isCaptacao = true
          } else {
            hasRegular = true
          }
        })
      } else if (orderId) {
        const pays = paymentsMap.get(orderId) || []
        if (pays.length > 0) {
          pays.forEach((p) => {
            const m = (p.forma_pagamento || '').toLowerCase()
            if (m.includes('captação') || m.includes('captacao')) {
              isCaptacao = true
            } else {
              hasRegular = true
            }
          })
        } else {
          hasRegular = true
        }
      } else {
        hasRegular = true
      }

      if (isCaptacao && !hasRegular) {
        captacaoMap.set(dateStr, (captacaoMap.get(dateStr) || 0) + 1)
      } else {
        regularMap.set(dateStr, (regularMap.get(dateStr) || 0) + 1)
      }
    })

    return { regular: regularMap, captacao: captacaoMap }
  },
}
