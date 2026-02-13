import { supabase } from '@/lib/supabase/client'
import { Kit, KitItem, KitInsert, KitItemInsert } from '@/types/kit'

export const kitsService = {
  async getKits() {
    const { data, error } = await supabase
      .from('kits')
      .select('*, items:kit_items(*, product:PRODUTOS(*))')
      .order('nome')

    if (error) throw error
    return data as Kit[]
  },

  async getKitById(id: number) {
    const { data, error } = await supabase
      .from('kits')
      .select('*, items:kit_items(*, product:PRODUTOS(*))')
      .eq('id', id)
      .single()

    if (error) throw error
    return data as Kit
  },

  async createKit(kit: KitInsert) {
    const { data, error } = await supabase
      .from('kits')
      .insert(kit)
      .select()
      .single()

    if (error) throw error
    return data as Kit
  },

  async updateKit(id: number, kit: Partial<KitInsert>) {
    const { data, error } = await supabase
      .from('kits')
      .update(kit)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Kit
  },

  async deleteKit(id: number) {
    const { error } = await supabase.from('kits').delete().eq('id', id)
    if (error) throw error
  },

  async addKitItem(item: KitItemInsert) {
    const { data, error } = await supabase
      .from('kit_items')
      .insert(item)
      .select('*, product:PRODUTOS(*)')
      .single()

    if (error) throw error
    return data as KitItem
  },

  async updateKitItem(id: number, quantity: number) {
    const { data, error } = await supabase
      .from('kit_items')
      .update({ quantidade_padrao: quantity })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as KitItem
  },

  async removeKitItem(id: number) {
    const { error } = await supabase.from('kit_items').delete().eq('id', id)
    if (error) throw error
  },
}
