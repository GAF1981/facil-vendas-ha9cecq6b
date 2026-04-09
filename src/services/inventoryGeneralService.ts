import { supabase } from '@/lib/supabase/client'

export const inventoryGeneralService = {
  async getSessions() {
    const { data, error } = await supabase
      .from('ID Inventário')
      .select('id, data_inicio, data_fim, status')
      .order('id', { ascending: false })

    if (error) {
      console.error('Error loading sessions:', error)
      throw error
    }
    return data || []
  },

  async getInventoryData(sessionId: number) {
    const { data, error } = await supabase.rpc('get_inventory_data', {
      p_session_id: sessionId,
      p_funcionario_id: null as any,
    })

    if (error) {
      console.error('Error loading inventory data:', error)
      throw error
    }
    return data || []
  },

  async startNewSession() {
    const { data, error } = await supabase.rpc('start_new_inventory_session')
    if (error) throw error
    return data
  },

  async resetInitialBalances(sessionId: number) {
    const { error } = await supabase
      .from('BANCO_DE_DADOS')
      .update({ 'SALDO INICIAL': 0 })
      .eq('session_id', sessionId)
    if (error) throw error
  },

  async finalizeAdjustments(sessionId: number, items: any[]) {
    const { error } = await supabase.rpc('start_new_inventory_session')
    if (error) throw error
  },

  async updateItemQuantity(
    sessionId: number,
    productId: number,
    type: string,
    value: number,
  ) {
    if (type === 'CONTAGEM') {
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

      // Update BANCO_DE_DADOS
      const { data: bdRecord } = await supabase
        .from('BANCO_DE_DADOS')
        .select('"ID VENDA ITENS"')
        .eq('session_id', sessionId)
        .eq('COD. PRODUTO', productId)
        .maybeSingle()

      if (bdRecord) {
        await supabase
          .from('BANCO_DE_DADOS')
          .update({ CONTAGEM: value })
          .eq('ID VENDA ITENS', bdRecord['ID VENDA ITENS'])
      }
    }
  },

  async getMovementDetails(sessionId: number, productId: number) {
    const movements: any[] = []

    const [
      { data: compras },
      { data: perdas },
      { data: devolucoes },
      { data: reposicoes },
    ] = await Promise.all([
      supabase
        .from('ESTOQUE GERAL COMPRAS')
        .select('*')
        .eq('id_inventario', sessionId)
        .eq('produto_id', productId),
      supabase
        .from('ESTOQUE GERAL SAÍDAS PERDAS')
        .select('*')
        .eq('id_inventario', sessionId)
        .eq('produto_id', productId),
      supabase
        .from('ESTOQUE CARRO: CARRO PARA O ESTOQUE')
        .select('*')
        .eq('produto_id', productId),
      supabase
        .from('ESTOQUE CARRO: ESTOQUE PARA O CARRO')
        .select('*')
        .eq('produto_id', productId),
    ])

    if (compras)
      compras.forEach((c) =>
        movements.push({
          ...c,
          movement_type: 'compra',
          data_horario: c.created_at,
          quantidade: c.compras_quantidade,
        }),
      )
    if (perdas)
      perdas.forEach((p) =>
        movements.push({
          ...p,
          movement_type: 'perda',
          data_horario: p.created_at,
          quantidade: p.quantidade,
        }),
      )
    if (devolucoes)
      devolucoes.forEach((d) =>
        movements.push({
          ...d,
          movement_type: 'devolucao_carro',
          data_horario: d.data_horario || d.created_at,
          quantidade: d.quantidade,
          id_estoque_carro: d.id_estoque_carro,
        }),
      )
    if (reposicoes)
      reposicoes.forEach((r) =>
        movements.push({
          ...r,
          movement_type: 'reposicao_carro',
          data_horario: r.data_horario || r.created_at,
          quantidade: r.quantidade,
          id_estoque_carro: r.id_estoque_carro,
        }),
      )

    return movements.sort(
      (a, b) =>
        new Date(b.data_horario).getTime() - new Date(a.data_horario).getTime(),
    )
  },

  async updateMovementQty(
    id: number,
    movement_type: string,
    newQtd: number,
    sessionId: number,
    productId: number,
  ) {
    switch (movement_type) {
      case 'compra':
        await supabase
          .from('ESTOQUE GERAL COMPRAS')
          .update({ compras_quantidade: newQtd })
          .eq('id', id)
        break
      case 'perda':
        await supabase
          .from('ESTOQUE GERAL SAÍDAS PERDAS')
          .update({ quantidade: newQtd })
          .eq('id', id)
        break
      case 'devolucao_carro':
        await supabase
          .from('ESTOQUE CARRO: CARRO PARA O ESTOQUE')
          .update({ quantidade: newQtd })
          .eq('id', id)
        break
      case 'reposicao_carro':
        await supabase
          .from('ESTOQUE CARRO: ESTOQUE PARA O CARRO')
          .update({ quantidade: newQtd })
          .eq('id', id)
        break
    }
  },

  async deleteMovementRecord(
    id: number,
    movement_type: string,
    sessionId: number,
    productId: number,
  ) {
    switch (movement_type) {
      case 'compra':
        await supabase.from('ESTOQUE GERAL COMPRAS').delete().eq('id', id)
        break
      case 'perda':
        await supabase.from('ESTOQUE GERAL SAÍDAS PERDAS').delete().eq('id', id)
        break
      case 'devolucao_carro':
        await supabase
          .from('ESTOQUE CARRO: CARRO PARA O ESTOQUE')
          .delete()
          .eq('id', id)
        break
      case 'reposicao_carro':
        await supabase
          .from('ESTOQUE CARRO: ESTOQUE PARA O CARRO')
          .delete()
          .eq('id', id)
        break
    }
  },

  async registerMovement(params: {
    type: 'devolucao_carro' | 'reposicao_carro' | 'compra' | 'perda'
    productId: number
    quantidade: number
    sessionId?: number
    idEstoqueCarro?: number
    funcionarioId?: number
    funcionarioNome?: string
  }) {
    const {
      type,
      productId,
      quantidade,
      sessionId,
      idEstoqueCarro,
      funcionarioId,
      funcionarioNome,
    } = params

    if (type === 'devolucao_carro') {
      const { error } = await supabase
        .from('ESTOQUE CARRO: CARRO PARA O ESTOQUE')
        .insert({
          produto_id: productId,
          quantidade: quantidade,
          id_estoque_carro: idEstoqueCarro || 0,
          funcionario: funcionarioNome || String(funcionarioId || ''),
          funcionario_id: funcionarioId || null,
          data_horario: new Date().toISOString(),
        } as any)
      if (error) throw error

      if (funcionarioId) {
        await supabase.from('REPOSIÇÃO E DEVOLUÇÃO').insert({
          TIPO: 'DEVOLUCAO',
          produto_id: productId,
          quantidade: quantidade,
          funcionario_id: funcionarioId,
          session_id: sessionId,
          id_estoque_carro: idEstoqueCarro,
        })
      }
    } else if (type === 'reposicao_carro') {
      const { error } = await supabase
        .from('ESTOQUE CARRO: ESTOQUE PARA O CARRO')
        .insert({
          produto_id: productId,
          quantidade: quantidade,
          id_estoque_carro: idEstoqueCarro || 0,
          funcionario: funcionarioNome || String(funcionarioId || ''),
          funcionario_id: funcionarioId || null,
          data_horario: new Date().toISOString(),
        } as any)
      if (error) throw error

      if (funcionarioId) {
        await supabase.from('REPOSIÇÃO E DEVOLUÇÃO').insert({
          TIPO: 'REPOSICAO',
          produto_id: productId,
          quantidade: quantidade,
          funcionario_id: funcionarioId,
          session_id: sessionId,
          id_estoque_carro: idEstoqueCarro,
        })
      }
    } else if (type === 'compra') {
      const { error } = await supabase.from('ESTOQUE GERAL COMPRAS').insert({
        produto_id: productId,
        compras_quantidade: quantidade,
        id_inventario: sessionId,
      })
      if (error) throw error
    } else if (type === 'perda') {
      const { error } = await supabase
        .from('ESTOQUE GERAL SAÍDAS PERDAS')
        .insert({
          produto_id: productId,
          quantidade: quantidade,
          id_inventario: sessionId,
          motivo: 'Perda/Quebra registrada',
        })
      if (error) throw error
    }
  },
}
