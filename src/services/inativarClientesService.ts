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
      .eq('status', 'PENDENTE')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as InativarCliente[]
  },

  async getHistory() {
    const { data, error } = await supabase
      .from('inativar_clientes')
      .select('*')
      .eq('status', 'CONCLUIDO')
      .order('created_at', { ascending: false })
      .limit(100) // Limit history to recent 100

    if (error) throw error
    return data as InativarCliente[]
  },

  async create(data: InativarClienteInsert) {
    const { error } = await supabase.from('inativar_clientes').insert({
      ...data,
      status: 'PENDENTE',
      expositor_retirado: false,
    })
    if (error) throw error
  },

  async updateExpositorStatus(
    id: number,
    retirado: boolean,
    observacoes: string | null,
  ) {
    const { error } = await supabase
      .from('inativar_clientes')
      .update({
        expositor_retirado: retirado,
        observacoes_expositor: observacoes,
      } as any)
      .eq('id', id)

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

    // 2. Mark as completed in inativar_clientes table
    const { error: statusError } = await supabase
      .from('inativar_clientes')
      .update({ status: 'CONCLUIDO' } as any)
      .eq('id', id)

    if (statusError) throw statusError
  },

  async removeEntry(id: number) {
    const { error } = await supabase
      .from('inativar_clientes')
      .delete()
      .eq('id', id)

    if (error) throw error
  },
}
