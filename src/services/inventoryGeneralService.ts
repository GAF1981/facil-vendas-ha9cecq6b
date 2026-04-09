import { supabase } from '@/lib/supabase/client'

export const inventoryGeneralService = {
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
        }),
      )
    if (reposicoes)
      reposicoes.forEach((r) =>
        movements.push({
          ...r,
          movement_type: 'reposicao_carro',
          data_horario: r.data_horario || r.created_at,
          quantidade: r.quantidade,
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
