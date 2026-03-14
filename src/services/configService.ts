import { supabase } from '@/lib/supabase/client'

export const configService = {
  async getConfig(chave: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', chave)
      .single()

    if (error) {
      console.error(`Error fetching config ${chave}:`, error)
      return null
    }
    return data?.valor || null
  },

  async setConfig(chave: string, valor: string): Promise<void> {
    const { error } = await supabase
      .from('configuracoes')
      .upsert({ chave, valor }, { onConflict: 'chave' })

    if (error) {
      console.error(`Error saving config ${chave}:`, error)
      throw error
    }
  },
}
