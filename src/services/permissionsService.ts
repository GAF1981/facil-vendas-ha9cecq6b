import { supabase } from '@/lib/supabase/client'

export interface Permission {
  id: number
  setor: string
  modulo: string
  acesso: boolean
}

const MODULES_LIST = [
  'Clientes',
  'Funcionários',
  'Produtos',
  'Acerto',
  'Recebimento',
  'Pix',
  'Cobrança',
  'Nota Fiscal',
  'Caixa',
  'Inventário',
  'Rota',
  'Resumo Acertos',
  'Relatório',
  'Pendências',
  'Backup',
  'Permissões',
]

export const permissionsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('permissoes')
      .select('*')
      .order('setor')
      .order('modulo')

    if (error) throw error
    return data as Permission[]
  },

  async getSectors() {
    // Fetch unique sectors from PERMISSOES
    const { data: permData, error: permError } = await supabase
      .from('permissoes')
      .select('setor')

    if (permError) throw permError

    // Fetch unique sectors from FUNCIONARIOS to ensure we capture all in use
    const { data: empData, error: empError } = await supabase
      .from('FUNCIONARIOS')
      .select('setor')

    if (empError) console.error('Error fetching employee sectors', empError)

    const uniqueSectors = new Set<string>([
      'Vendedor',
      'Estoque',
      'Motoqueiro',
      'Financeiro',
      'Administrador',
      'Outros',
    ])

    permData?.forEach((p) => uniqueSectors.add(p.setor))
    empData?.forEach((e) => {
      if (e.setor) uniqueSectors.add(e.setor)
    })

    return Array.from(uniqueSectors).sort()
  },

  async updatePermission(id: number, acesso: boolean) {
    const { error } = await supabase
      .from('permissoes')
      .update({ acesso })
      .eq('id', id)

    if (error) throw error
  },

  async updatePermissionsBulk(ids: number[], acesso: boolean) {
    const { error } = await supabase
      .from('permissoes')
      .update({ acesso })
      .in('id', ids)

    if (error) throw error
  },

  async getPermissionsBySetor(setor: string) {
    const { data, error } = await supabase
      .from('permissoes')
      .select('*')
      .eq('setor', setor)

    if (error) throw error
    return data as Permission[]
  },

  // Helper to init permissions if missing for a sector
  async initPermissionsForSetor(setor: string) {
    const inserts = MODULES_LIST.map((m) => ({
      setor,
      modulo: m,
      acesso: true, // Default to true
    }))

    const { error } = await supabase
      .from('permissoes')
      .upsert(inserts, { onConflict: 'setor,modulo' })

    if (error) console.error('Error init permissions', error)
  },

  getAvailableModules() {
    return MODULES_LIST
  },
}
