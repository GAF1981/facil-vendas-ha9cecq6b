import { supabase } from '@/lib/supabase/client'

export interface DRELancamento {
  id: number
  mes_referencia: string
  data_lancamento: string
  tipo: string
  categoria: string | null
  valor: number
}

export const dreService = {
  async getCustosFixos(
    startDate: string,
    endDate: string,
  ): Promise<DRELancamento[]> {
    const { data, error } = await supabase
      .from('dre_lancamentos')
      .select('*')
      .eq('tipo', 'CUSTO_FIXO')
      .gte('data_lancamento', startDate)
      .lte('data_lancamento', endDate)
      .order('data_lancamento', { ascending: false })

    if (error) throw error
    return data as DRELancamento[]
  },

  async addLancamento(payload: Partial<DRELancamento>) {
    const { error } = await supabase.from('dre_lancamentos').insert(payload)
    if (error) throw error
  },

  async deleteLancamento(id: number) {
    const { error } = await supabase
      .from('dre_lancamentos')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async getCategorias() {
    const { data, error } = await supabase
      .from('dre_categorias')
      .select('*')
      .order('nome')
    if (error) throw error
    return data
  },

  async addCategoria(nome: string, tipo: string, recorrente: boolean = false) {
    const { data, error } = await supabase
      .from('dre_categorias')
      .insert({ nome, tipo, recorrente })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateCategoriaRecorrente(nome: string, recorrente: boolean) {
    const { error } = await supabase
      .from('dre_categorias')
      .update({ recorrente })
      .eq('nome', nome)
    if (error) throw error
  },

  async getCMV(mesReferencia: string) {
    const { data, error } = await supabase
      .from('dre_lancamentos')
      .select('valor, id')
      .eq('tipo', 'CMV')
      .eq('mes_referencia', mesReferencia)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async saveCMV(mesReferencia: string, valor: number, id?: number) {
    if (id) {
      const { error } = await supabase
        .from('dre_lancamentos')
        .update({ valor })
        .eq('id', id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('dre_lancamentos').insert({
        mes_referencia: mesReferencia,
        tipo: 'CMV',
        valor,
        data_lancamento: new Date().toISOString().split('T')[0],
      })
      if (error) throw error
    }
  },

  async getDescontoClientePercentual(): Promise<number> {
    const { data, error } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'dre_desconto_cliente_percentual')
      .maybeSingle()
    if (error) throw error
    return data?.valor ? Number(data.valor) : 0
  },

  async saveDescontoClientePercentual(valor: number) {
    const { error } = await supabase
      .from('configuracoes')
      .upsert(
        { chave: 'dre_desconto_cliente_percentual', valor: String(valor) },
        { onConflict: 'chave' },
      )
    if (error) throw error
  },
}
