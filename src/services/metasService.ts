import { supabase } from '@/lib/supabase/client'
import { MetaFuncionario, MetaPeriodo } from '@/types/meta'

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

  async getAcertos(
    funcionarioId: number,
    funcionarioNome: string,
    startDate: string,
    endDate: string,
  ) {
    // Unificação de Filtro de Datas: consideramos tanto DATA DO ACERTO quanto DATA E HORA
    // Ampliamos a margem de busca para 1 dia antes e 1 dia depois, assegurando que
    // offsets de timezone não mascarem registros próximos da meia-noite
    const dStart = new Date(`${startDate}T12:00:00`)
    dStart.setDate(dStart.getDate() - 1)
    const dEnd = new Date(`${endDate}T12:00:00`)
    dEnd.setDate(dEnd.getDate() + 1)

    const startExtended = dStart.toISOString().split('T')[0]
    const endExtended = dEnd.toISOString().split('T')[0]

    const startCond = `"DATA DO ACERTO".gte.${startExtended},"DATA E HORA".gte.${startExtended}T00:00:00`
    const endCond = `"DATA DO ACERTO".lte.${endExtended},"DATA E HORA".lte.${endExtended}T23:59:59`

    const { data, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"DATA DO ACERTO", "DATA E HORA", "NÚMERO DO PEDIDO", "FORMA", "FUNCIONÁRIO", "CODIGO FUNCIONARIO"',
      )
      .not('NÚMERO DO PEDIDO', 'is', null)
      .or(startCond)
      .or(endCond)
      .limit(100000)

    if (error) throw error

    const orderForms = new Map<number, Set<string>>()
    const orderDates = new Map<number, string>()
    const orderEmployees = new Map<
      number,
      { id: number | null; nome: string }
    >()

    data?.forEach((row) => {
      let dateStr = row['DATA DO ACERTO']

      if (!dateStr && row['DATA E HORA']) {
        // Conversão com timezone seguro para não avançar/retroceder dias em horários limite
        try {
          dateStr = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Sao_Paulo',
          }).format(new Date(row['DATA E HORA']))
        } catch {
          dateStr = row['DATA E HORA'].split('T')[0]
        }
      }
      if (!dateStr) return

      if (dateStr.includes('T')) dateStr = dateStr.split('T')[0]
      else if (dateStr.includes(' ')) dateStr = dateStr.split(' ')[0]

      const orderId = row['NÚMERO DO PEDIDO']
      if (!orderId) return

      if (!orderForms.has(orderId as number)) {
        orderForms.set(orderId as number, new Set())
        orderDates.set(orderId as number, dateStr)
        orderEmployees.set(orderId as number, {
          id: row['CODIGO FUNCIONARIO'],
          nome: row['FUNCIONÁRIO'] || '',
        })
      }

      const forma = row['FORMA']
      if (forma) {
        orderForms.get(orderId as number)!.add(forma.toLowerCase())
      }
    })

    const regularMap = new Map<string, number>()
    const captacaoMap = new Map<string, number>()
    const normFuncNome = normalizeName(funcionarioNome)

    orderForms.forEach((forms, orderId) => {
      const emp = orderEmployees.get(orderId)!

      // Refinamento de Identificação com normalização (Sousa vs Souza, espaços e acentos)
      const matchesId = emp.id?.toString() === funcionarioId.toString()
      const matchesName = normalizeName(emp.nome) === normFuncNome

      if (!matchesId && !matchesName) return

      const dateStr = orderDates.get(orderId)!

      // Aplicamos o filtro estrito da data na memória (cobrindo a extensão da query)
      if (dateStr < startDate || dateStr > endDate) return

      // Espelhamento de Cálculo: Identificar se o pedido inteiro é captação ou acerto regular
      let isCaptacao = false
      let hasRegular = false
      forms.forEach((f) => {
        if (f.includes('captação') || f.includes('captacao')) {
          isCaptacao = true
        } else {
          hasRegular = true
        }
      })

      // Somente marcamos como Captação se não houver NENHUMA forma de pagamento regular
      if (isCaptacao && !hasRegular) {
        captacaoMap.set(dateStr, (captacaoMap.get(dateStr) || 0) + 1)
      } else {
        regularMap.set(dateStr, (regularMap.get(dateStr) || 0) + 1)
      }
    })

    return { regular: regularMap, captacao: captacaoMap }
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
}
