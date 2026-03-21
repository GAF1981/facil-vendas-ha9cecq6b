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

  async getAcertos(
    funcionarioId: number,
    funcionarioNome: string,
    startDate: string,
    endDate: string,
  ) {
    // Unificação de Filtro de Datas: consideramos tanto DATA DO ACERTO quanto DATA E HORA
    const startCond = `"DATA DO ACERTO".gte.${startDate},"DATA E HORA".gte.${startDate}T00:00:00`
    const endCond = `"DATA DO ACERTO".lte.${endDate},"DATA E HORA".lte.${endDate}T23:59:59`

    const { data, error } = await supabase
      .from('BANCO_DE_DADOS')
      .select(
        '"DATA DO ACERTO", "DATA E HORA", "NÚMERO DO PEDIDO", "FORMA", "FUNCIONÁRIO", "CODIGO FUNCIONARIO"',
      )
      .not('NÚMERO DO PEDIDO', 'is', null)
      .or(startCond)
      .or(endCond)

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
        dateStr = row['DATA E HORA'].split('T')[0]
      }
      if (!dateStr) return

      if (dateStr.includes('T')) dateStr = dateStr.split('T')[0]
      else if (dateStr.includes(' ')) dateStr = dateStr.split(' ')[0]

      // Asseguramos que o registro caiu no período após as flexibilidades do OR
      if (dateStr < startDate || dateStr > endDate) return

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

    orderForms.forEach((forms, orderId) => {
      const emp = orderEmployees.get(orderId)!

      // Refinamento de Identificação: Espelhamento exato com a regra do "Resumo de Acertos"
      const matchesId = emp.id?.toString() === funcionarioId.toString()
      const matchesName = emp.nome === funcionarioNome

      if (!matchesId && !matchesName) return

      const dateStr = orderDates.get(orderId)!

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
