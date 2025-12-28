import { supabase } from '@/lib/supabase/client'
import { Acerto, LastAcertoInfo } from '@/types/acerto'
import { format, parseISO } from 'date-fns'

export const acertoService = {
  async getLastAcerto(clienteId: number): Promise<LastAcertoInfo | null> {
    // We execute two queries in parallel:
    // 1. Get the absolute last transaction (Acerto) date for this client
    // 2. Get the last transaction that was specifically a "CAPTAÇÃO"

    // Note: DATA DO ACERTO is now a native DATE column, ensuring correct chronological sorting.
    const [lastAcertoResult, lastCaptacaoResult] = await Promise.all([
      supabase
        .from('BANCO_DE_DADOS')
        .select('"DATA DO ACERTO", "HORA DO ACERTO"')
        .eq('COD. CLIENTE', clienteId)
        .not('DATA DO ACERTO', 'is', null) // Explicitly filter out NULL dates
        .order('DATA DO ACERTO', { ascending: false })
        .order('HORA DO ACERTO', { ascending: false }) // Use time as tie-breaker
        .limit(1)
        .maybeSingle(),
      supabase
        .from('BANCO_DE_DADOS')
        .select('"DATA DO ACERTO"')
        .eq('COD. CLIENTE', clienteId)
        .ilike('FORMA', '%CAPTAÇÃO%') // Filter specifically for Captação
        .order('DATA DO ACERTO', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    if (lastAcertoResult.error) {
      console.error('Error fetching last acerto:', lastAcertoResult.error)
      return null
    }

    // We continue even if captacao fails, treating it as not found
    if (lastCaptacaoResult.error) {
      console.error('Error fetching last captacao:', lastCaptacaoResult.error)
    }

    // If no records found for this client at all, we return an object with nulls
    // so the UI can display "Nenhum acerto encontrado" instead of crashing or showing nothing
    if (!lastAcertoResult.data) {
      return {
        data: null,
        hora: null,
        captacao: null,
      }
    }

    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return null
      try {
        // Return in dd/MM/yyyy format (e.g., 15/12/2025)
        return format(parseISO(dateStr), 'dd/MM/yyyy')
      } catch (e) {
        console.error('Error formatting date:', dateStr, e)
        return dateStr
      }
    }

    return {
      data: formatDate(lastAcertoResult.data['DATA DO ACERTO']),
      hora: lastAcertoResult.data['HORA DO ACERTO'] || null,
      captacao: formatDate(lastCaptacaoResult.data?.['DATA DO ACERTO'] || null),
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
