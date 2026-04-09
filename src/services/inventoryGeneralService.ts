import { supabase } from '@/lib/supabase/client'
import {
  InventoryGeneralSession,
  InventoryGeneralItem,
  InventoryMovementType,
} from '@/types/inventory_general'

export const inventoryGeneralService = {
  async getSessions(): Promise<InventoryGeneralSession[]> {
    try {
      const { data, error } = await supabase
        .from('ID Inventário')
        .select('*')
        .order('id', { ascending: false })

      if (error) {
        console.error('Erro ao buscar sessões em ID Inventário:', error)
        throw error
      }

      return data.map((s) => ({
        id: s.id,
        data_inicio: s.data_inicio,
        data_fim: s.data_fim,
        status: s.status,
      })) as InventoryGeneralSession[]
    } catch (err) {
      console.error('Erro crítico em getSessions:', err)
      return []
    }
  },

  async getInventoryData(sessionId: number): Promise<InventoryGeneralItem[]> {
    try {
      // Usamos a tipagem forçada null as unknown as number para satisfazer o TypeScript
      // O Supabase lida corretamente com o null no backend usando a condição (p_funcionario_id IS NULL)
      const { data, error } = await supabase.rpc('get_inventory_data', {
        p_session_id: sessionId,
        p_funcionario_id: null as unknown as number,
      })

      if (error) {
        console.error('Erro ao executar RPC get_inventory_data:', error)

        // Fallback robusto direto na tabela BANCO_DE_DADOS
        const { data: rawData, error: dbError } = await supabase
          .from('BANCO_DE_DADOS')
          .select(
            `
            "ID VENDA ITENS",
            "COD. PRODUTO",
            "MERCADORIA",
            "TIPO",
            "SALDO INICIAL",
            "SALDO FINAL",
            "CONTAGEM"
          `,
          )
          .eq('session_id', sessionId)

        if (dbError) throw dbError

        return (rawData || []).map((item: any) => ({
          id: item['ID VENDA ITENS'],
          produto_id: item['COD. PRODUTO'],
          codigo_barras: '',
          mercadoria: item['MERCADORIA'] || 'Produto N/D',
          produto: item['MERCADORIA'] || 'Produto N/D',
          tipo: item['TIPO'] || 'OUTROS',
          preco: 0,
          saldo_inicial: item['SALDO INICIAL'] || 0,
          saldo_final: item['SALDO FINAL'] || 0,
          contagem: item['CONTAGEM'] || 0,
          entrada_estoque_carro: 0,
          saida_carro_estoque: 0,
          entrada_cliente_carro: 0,
          saida_carro_cliente: 0,
          has_count_record: (item['CONTAGEM'] || 0) > 0,
          is_mandatory: false,
          frequentes: 'NÃO',
        })) as InventoryGeneralItem[]
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        produto_id: item.codigo_produto || item.id,
        codigo_barras: item.codigo_barras,
        mercadoria: item.mercadoria || item.produto || 'Produto N/D',
        produto: item.mercadoria || item.produto || 'Produto N/D',
        tipo: item.tipo || 'OUTROS',
        preco: item.preco || 0,
        saldo_inicial: item.saldo_inicial || 0,
        saldo_final: item.saldo_final || 0,
        contagem: item.contagem || 0,
        entrada_estoque_carro: item.entrada_estoque_carro || 0,
        saida_carro_estoque: item.saida_carro_estoque || 0,
        entrada_cliente_carro: item.entrada_cliente_carro || 0,
        saida_carro_cliente: item.saida_carro_cliente || 0,
        has_count_record: (item.contagem || 0) > 0,
        is_mandatory: false,
        frequentes: 'NÃO',
      })) as InventoryGeneralItem[]
    } catch (err) {
      console.error('Erro crítico ao carregar itens do inventário:', err)
      return []
    }
  },

  async startNewSession(): Promise<any> {
    const { data, error } = await supabase.rpc('start_new_inventory_session')
    if (error) throw error
    return data
  },

  async resetInitialBalances(sessionId: number): Promise<void> {
    const { error } = await supabase
      .from('BANCO_DE_DADOS')
      .update({ 'SALDO INICIAL': 0 })
      .eq('session_id', sessionId)
    if (error) throw error
  },

  async updateItemQuantity(
    sessionId: number,
    productId: number,
    type: string,
    value: number,
  ): Promise<void> {
    // 1. Atualizar CONTAGEM DE ESTOQUE FINAL
    const { data: existing } = await supabase
      .from('CONTAGEM DE ESTOQUE FINAL')
      .select('id')
      .eq('session_id', sessionId)
      .eq('produto_id', productId)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('CONTAGEM DE ESTOQUE FINAL')
        .update({ quantidade: value })
        .eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('CONTAGEM DE ESTOQUE FINAL')
        .insert({
          session_id: sessionId,
          produto_id: productId,
          quantidade: value,
        })
      if (error) throw error
    }

    // 2. Sincronizar o campo CONTAGEM na tabela BANCO_DE_DADOS
    const { error: bdError } = await supabase
      .from('BANCO_DE_DADOS')
      .update({ CONTAGEM: value })
      .eq('session_id', sessionId)
      .eq('COD. PRODUTO', productId)

    if (bdError) {
      console.warn(
        'Aviso: Não foi possível atualizar BANCO_DE_DADOS.CONTAGEM',
        bdError,
      )
    }
  },

  async finalizeAdjustments(sessionId: number, items: any[]): Promise<any> {
    const { error } = await supabase
      .from('ID Inventário')
      .update({ status: 'FECHADO', data_fim: new Date().toISOString() })
      .eq('id', sessionId)
    if (error) throw error

    const { data, error: startError } = await supabase.rpc(
      'start_new_inventory_session',
    )
    if (startError) throw startError
    return data
  },

  async registerMovement(
    sessionId: number,
    type: InventoryMovementType,
    items: { productId: number; quantity: number; extra?: any }[],
  ): Promise<void> {
    for (const item of items) {
      if (type === 'COMPRA') {
        const { error } = await supabase.from('ESTOQUE GERAL COMPRAS').insert({
          id_inventario: sessionId,
          produto_id: item.productId,
          fornecedor_id: item.extra?.fornecedorId,
          valor_unitario: item.extra?.valorUnitario,
          compras_quantidade: item.quantity,
        })
        if (error) throw error
      } else if (type === 'PERDA') {
        const { error } = await supabase
          .from('ESTOQUE GERAL SAÍDAS PERDAS')
          .insert({
            id_inventario: sessionId,
            produto_id: item.productId,
            quantidade: item.quantity,
            motivo: item.extra?.motivo,
          })
        if (error) throw error
      } else if (type === 'CARRO_PARA_ESTOQUE') {
        const { error: err1 } = await supabase
          .from('ESTOQUE GERAL CARRO PARA ESTOQUE')
          .insert({
            id_inventario: sessionId,
            produto_id: item.productId,
            quantidade: item.quantity,
            funcionario_id: item.extra?.funcionarioId,
          })
        if (err1) throw err1

        let validSessionId = null
        if (item.extra?.funcionarioId) {
          const { data: dtInv } = await supabase
            .from('DATAS DE INVENTÁRIO')
            .select('ID INVENTÁRIO')
            .eq('CODIGO FUNCIONARIO', item.extra.funcionarioId)
            .order('ID INVENTÁRIO', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (dtInv) validSessionId = dtInv['ID INVENTÁRIO']
        }

        const { error: err2 } = await supabase
          .from('REPOSIÇÃO E DEVOLUÇÃO')
          .insert({
            session_id: validSessionId,
            produto_id: item.productId,
            quantidade: item.quantity,
            funcionario_id: item.extra?.funcionarioId,
            id_estoque_carro: item.extra?.id_estoque_carro,
            TIPO: 'DEVOLUCAO',
          })
        if (err2) throw err2
      } else if (type === 'ESTOQUE_PARA_CARRO') {
        const { error: err1 } = await supabase
          .from('ESTOQUE GERAL ESTOQUE PARA CARRO')
          .insert({
            id_inventario: sessionId,
            produto_id: item.productId,
            quantidade: item.quantity,
            funcionario_id: item.extra?.funcionarioId,
          })
        if (err1) throw err1

        let validSessionId = null
        if (item.extra?.funcionarioId) {
          const { data: dtInv } = await supabase
            .from('DATAS DE INVENTÁRIO')
            .select('ID INVENTÁRIO')
            .eq('CODIGO FUNCIONARIO', item.extra.funcionarioId)
            .order('ID INVENTÁRIO', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (dtInv) validSessionId = dtInv['ID INVENTÁRIO']
        }

        const { error: err2 } = await supabase
          .from('REPOSIÇÃO E DEVOLUÇÃO')
          .insert({
            session_id: validSessionId,
            produto_id: item.productId,
            quantidade: item.quantity,
            funcionario_id: item.extra?.funcionarioId,
            id_estoque_carro: item.extra?.id_estoque_carro,
            TIPO: 'REPOSICAO',
          })
        if (err2) throw err2
      } else if (type === 'CONTAGEM') {
        const { error: err1 } = await supabase
          .from('ESTOQUE GERAL CONTAGEM')
          .insert({
            id_inventario: sessionId,
            produto_id: item.productId,
            quantidade: item.quantity,
          })
        if (err1) throw err1

        const { data: existing } = await supabase
          .from('CONTAGEM DE ESTOQUE FINAL')
          .select('quantidade')
          .eq('session_id', sessionId)
          .eq('produto_id', item.productId)
          .maybeSingle()

        const currentQty = existing?.quantidade || 0
        const newQty = currentQty + item.quantity

        await this.updateItemQuantity(
          sessionId,
          item.productId,
          'CONTAGEM',
          newQty,
        )
      }
    }
  },
}
