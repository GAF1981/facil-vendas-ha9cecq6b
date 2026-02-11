import { supabase } from '@/lib/supabase/client'
import { Supplier, SupplierFormData } from '@/types/supplier'

export const suppliersService = {
  async getAll() {
    const { data, error } = await supabase
      .from('FORNECEDORES')
      .select('*')
      .order('nome_fornecedor')

    if (error) throw error
    return (data as unknown as Supplier[]) || []
  },

  async create(supplier: SupplierFormData) {
    const { data, error } = await supabase
      .from('FORNECEDORES')
      .insert({
        nome_fornecedor: supplier.nome_fornecedor,
        cnpj: supplier.cnpj,
        telefone: supplier.telefone,
        endereco: supplier.endereco,
        contatos: supplier.contatos as unknown as any,
      })
      .select()
      .single()

    if (error) throw error
    return data as unknown as Supplier
  },

  async update(id: number, supplier: SupplierFormData) {
    const { data, error } = await supabase
      .from('FORNECEDORES')
      .update({
        nome_fornecedor: supplier.nome_fornecedor,
        cnpj: supplier.cnpj,
        telefone: supplier.telefone,
        endereco: supplier.endereco,
        contatos: supplier.contatos as unknown as any,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as unknown as Supplier
  },

  async delete(id: number) {
    const { error } = await supabase.from('FORNECEDORES').delete().eq('id', id)

    if (error) throw error
  },
}
