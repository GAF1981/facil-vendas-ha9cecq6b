import { supabase } from '@/lib/supabase/client'
import { Acerto, LastAcertoInfo } from '@/types/acerto'

export const acertoService = {
  async getLastAcerto(clienteId: number): Promise<LastAcertoInfo | null> {
    const [lastAcertoResult, lastCaptacaoResult] = await Promise.all([
      supabase
        .from('BANCO_DE_DADOS')
        .select('"DATA DO ACERTO", "HORA DO ACERTO"')
        .eq('COD. CLIENTE', clienteId)
        .order('DATA DO ACERTO', { ascending: false })
        .order('HORA DO ACERTO', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('BANCO_DE_DADOS')
        .select('"DATA DO ACERTO"')
        .eq('COD. CLIENTE', clienteId)
        .ilike('FORMA', '%CAPTAÇÃO%') // Updated to match records containing "CAPTAÇÃO"
        .order('DATA DO ACERTO', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (lastAcertoResult.error) {
      console.error('Error fetching last acerto:', lastAcertoResult.error)
      return null
    }

    if (lastCaptacaoResult.error) {
      console.error('Error fetching last captacao:', lastCaptacaoResult.error)
      // We continue even if captacao fails, treating it as not found
    }

    if (!lastAcertoResult.data) return null

    return {
      data: lastAcertoResult.data['DATA DO ACERTO'] || null,
      hora: lastAcertoResult.data['HORA DO ACERTO'] || null,
      captacao: lastCaptacaoResult.data?.['DATA DO ACERTO'] || null,
    }
  },

  async saveAcerto(acerto: Acerto) {
    // 1. Create Acerto Header
    const { data: acertoData, error: acertoError } = await supabase
      .from('ACERTOS')
      .insert({
        CLIENTE_ID: acerto.clienteId,
        FUNCIONARIO_ID: acerto.funcionarioId,
        VALOR_TOTAL: acerto.valorTotal,
        OBSERVACOES: acerto.observacoes,
        DATA_ACERTO: new Date().toISOString(),
      })
      .select()
      .single()

    if (acertoError) throw acertoError
    if (!acertoData) throw new Error('Falha ao criar acerto')

    // 2. Create Items
    const itemsToInsert = acerto.itens.map((item) => ({
      ACERTO_ID: acertoData.ID,
      PRODUTO_ID: item.produtoId,
      SALDO_INICIAL: item.saldoInicial,
      CONTAGEM: item.contagem,
      QUANT_VENDIDA: item.quantVendida,
      PRECO_UNITARIO: item.precoUnitario,
      VALOR_VENDIDO: item.valorVendido,
      SALDO_FINAL: item.saldoFinal,
    }))

    const { error: itemsError } = await supabase
      .from('ITENS_ACERTO')
      .insert(itemsToInsert)

    if (itemsError) {
      // If items fail, we should technically rollback, but for simplicity we'll just throw
      // Ideally this would be an RPC call or transaction
      console.error('Error inserting items:', itemsError)
      throw itemsError
    }

    return acertoData
  },

  async generatePdf(data: any) {
    const { data: blob, error } = await supabase.functions.invoke(
      'generate-pdf',
      {
        body: data,
        // @ts-expect-error - responseType is valid in v2 but might be missing in types
        responseType: 'blob',
      },
    )

    if (error) throw error
    return blob as Blob
  },
}
