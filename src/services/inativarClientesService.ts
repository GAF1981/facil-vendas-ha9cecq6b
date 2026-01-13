import { supabase } from '@/lib/supabase/client'
import {
  InativarCliente,
  InativarClienteInsert,
} from '@/types/inativar_clientes'

export const inativarClientesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('inativar_clientes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as InativarCliente[]
  },

  async create(data: InativarClienteInsert) {
    const { error } = await supabase.from('inativar_clientes').insert(data)
    if (error) throw error
  },

  async inactivateClient(
    id: number,
    clientCode: number,
    currentName: string | null,
  ) {
    // 1. Update client status to 'INATIVO'
    const { error: updateError } = await supabase
      .from('CLIENTES')
      .update({ situacao: 'INATIVO' } as any)
      .eq('CODIGO', clientCode)

    if (updateError) throw updateError

    // 2. Remove from inativar_clientes table (processed)
    await this.removeEntry(id)
  },

  async removeEntry(id: number) {
    const { error } = await supabase
      .from('inativar_clientes')
      .delete()
      .eq('id', id)

    if (error) throw error
  },
}
