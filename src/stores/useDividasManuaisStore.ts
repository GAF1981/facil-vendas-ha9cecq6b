import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'
import { DividaManual } from '@/types/divida-manual'

interface Store {
  dividas: DividaManual[]
  loading: boolean
  fetchDividas: () => Promise<void>
  addDivida: (d: any | any[]) => Promise<void>
  updateDivida: (id: number, d: any) => Promise<void>
  deleteDivida: (id: number) => Promise<void>
}

export const useDividasManuaisStore = create<Store>((set, get) => ({
  dividas: [],
  loading: false,
  fetchDividas: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('dividas_manuais')
      .select(
        `
        *,
        FUNCIONARIOS ( nome_completo ),
        CLIENTES ( "NOME CLIENTE", "TIPO DE CLIENTE", "FONE 1", "FONE 2", telefone_cobranca )
      `,
      )
      .order('created_at', { ascending: false })

    if (!error && data) {
      set({ dividas: data as any })
    }
    set({ loading: false })
  },
  addDivida: async (d) => {
    const payload = Array.isArray(d) ? d : [d]
    const { error } = await supabase.from('dividas_manuais').insert(payload)
    if (!error) get().fetchDividas()
    else throw error
  },
  updateDivida: async (id, d) => {
    const { error } = await supabase
      .from('dividas_manuais')
      .update(d)
      .eq('id', id)
    if (!error) get().fetchDividas()
    else throw error
  },
  deleteDivida: async (id) => {
    const { error } = await supabase
      .from('dividas_manuais')
      .delete()
      .eq('id', id)
    if (!error) get().fetchDividas()
    else throw error
  },
}))
