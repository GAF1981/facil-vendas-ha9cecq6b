import { supabase } from '@/lib/supabase/client'
import { Supplier, SupplierFormData } from '@/types/supplier'

export const suppliersService = {
  async getAll() {
    const { data, error } = await supabase
      .from('FORNECEDORES')
      .select('*')
      .order('nome_fornecedor', { ascending: true })

    if (error) throw error
    return data as Supplier[]
  },

  async create(supplier: SupplierFormData) {
    const { data, error } = await supabase
      .from('FORNECEDORES')
      .insert(supplier)
      .select()
      .single()

    if (error) throw error
    return data as Supplier
  },

  async update(id: number, supplier: SupplierFormData) {
    const { data, error } = await supabase
      .from('FORNECEDORES')
      .update(supplier)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Supplier
  },

  async delete(id: number) {
    const { error } = await supabase.from('FORNECEDORES').delete().eq('id', id)

    if (error) throw error
  },
}
