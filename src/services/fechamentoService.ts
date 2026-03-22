import { supabase } from '@/lib/supabase/client'
import { FechamentoCaixa, FechamentoInsert } from '@/types/fechamento'
import { Rota } from '@/types/rota'
import { resumoAcertosService } from './resumoAcertosService'
import { caixaService } from './caixaService'

export const fechamentoService = {
  async getByRoute(rotaId: number) {
    const { data, error } = await supabase
      .from('fechamento_caixa')
      .select(
        `
        *,
        funcionario:FUNCIONARIOS!funcionario_id ( nome_completo, foto_url ),
        responsavel:FUNCIONARIOS!responsavel_id ( nome_completo ),
        recolhedor:FUNCIONARIOS!fechamento_caixa_recolhido_por_id_fkey ( nome_completo )
      `,
      )
      .eq('rota_id', rotaId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as FechamentoCaixa[]
  },

  async createClosing(
    rota: Rota,
    funcionarioId: number,
    responsavelId?: number,
  ) {
    const settlements = await resumoAcertosService.getSettlements({ rota })

    const employeeSettlements = settlements.filter(
      (s) => s.employeeId === funcionarioId,
    )

    const vendaTotal = employeeSettlements.reduce(
      (acc, s) => acc + s.totalSalesValue,
      0,
    )
    const descontoTotal = employeeSettlements.reduce(
      (acc, s) => acc + s.totalDiscount,
      0,
    )
    const valorAReceber = employeeSettlements.reduce(
      (acc, s) => acc + s.valorDevido,
      0,
    )

    const receipts = await caixaService.getEmployeeReceipts(funcionarioId, rota)

    const validReceipts = receipts.filter((r) => r.forma !== 'Boleto')
    const boletoReceipts = receipts.filter((r) => r.forma === 'Boleto')

    const valorDinheiro = validReceipts
      .filter((r) => r.forma === 'Dinheiro')
      .reduce((acc, r) => acc + r.valor, 0)

    const valorPix = validReceipts
      .filter((r) => r.forma === 'Pix')
      .reduce((acc, r) => acc + r.valor, 0)

    const valorCheque = validReceipts
      .filter((r) => r.forma === 'Cheque')
      .reduce((acc, r) => acc + r.valor, 0)

    const valorBoleto = boletoReceipts.reduce((acc, r) => acc + r.valor, 0)

    const allExpenses = await caixaService.getEmployeeExpenses(
      funcionarioId,
      rota,
    )
    const valorDespesas = allExpenses
      .filter((e) => e.saiuDoCaixa)
      .reduce((acc, e) => acc + e.valor, 0)

    const saldoAcerto = valorDinheiro + valorCheque - valorDespesas

    const payload: FechamentoInsert = {
      rota_id: rota.id,
      funcionario_id: funcionarioId,
      venda_total: vendaTotal,
      desconto_total: descontoTotal,
      valor_a_receber: valorAReceber,
      valor_dinheiro: valorDinheiro,
      valor_pix: valorPix,
      valor_cheque: valorCheque,
      valor_boleto: valorBoleto,
      valor_despesas: valorDespesas,
      saldo_acerto: saldoAcerto,
      status: 'Aberto', // Mudado de 'Fechado' para 'Aberto' para forçar conferência manual
      responsavel_id: null, // Mantém null até ser confirmado
    }

    const { data, error } = await supabase
      .from('fechamento_caixa')
      .upsert(payload, { onConflict: 'rota_id, funcionario_id' })
      .select(`*, funcionario:FUNCIONARIOS!funcionario_id ( nome_completo )`)
      .single()

    if (error) throw error
    return data as FechamentoCaixa
  },

  async updateApproval(
    id: number,
    field:
      | 'dinheiro_aprovado'
      | 'pix_aprovado'
      | 'cheque_aprovado'
      | 'boleto_aprovado'
      | 'despesas_aprovadas'
      | 'saldo_acerto_aprovado',
    value: boolean,
  ) {
    const { error } = await supabase
      .from('fechamento_caixa')
      .update({ [field]: value })
      .eq('id', id)

    if (error) throw error
  },

  async confirmClosing(id: number, responsavelId: number) {
    const { error } = await supabase
      .from('fechamento_caixa')
      .update({
        status: 'Fechado',
        responsavel_id: responsavelId,
        created_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error
  },

  async reopenClosing(id: number, rotaId: number, funcionarioNome: string) {
    const { error } = await supabase
      .from('fechamento_caixa')
      .update({
        status: 'Aberto',
        recolhido_at: null,
        recolhido_por_id: null,
        saldo_acerto_aprovado: false,
        despesas_aprovadas: false,
        dinheiro_aprovado: false,
        pix_aprovado: false,
        cheque_aprovado: false,
        boleto_aprovado: false,
        responsavel_id: null,
      })
      .eq('id', id)

    if (error) throw error
  },

  async cancelClosing(id: number) {
    const { error } = await supabase
      .from('fechamento_caixa')
      .delete()
      .eq('id', id)
      .eq('status', 'Aberto')

    if (error) throw error
  },

  async checkExistingClosing(rotaId: number, funcionarioId: number) {
    const { data, error } = await supabase
      .from('fechamento_caixa')
      .select('id')
      .eq('rota_id', rotaId)
      .eq('funcionario_id', funcionarioId)
      .limit(1)

    if (error) throw error
    return (data?.length || 0) > 0
  },

  async getClosureStatus(rotaId: number, funcionarioId: number) {
    const { data, error } = await supabase
      .from('fechamento_caixa')
      .select('status')
      .eq('rota_id', rotaId)
      .eq('funcionario_id', funcionarioId)
      .maybeSingle()

    if (error) throw error
    return data?.status || null
  },

  async markAsRecolhido(id: number, recolhedorId: number) {
    const { error } = await supabase
      .from('fechamento_caixa')
      .update({
        recolhido_por_id: recolhedorId,
        recolhido_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) throw error
  },

  async generateClosingPdf(
    fechamento: FechamentoCaixa,
    format: 'A4' | '80mm' = 'A4',
  ) {
    const rota = await resumoAcertosService.getRouteById(fechamento.rota_id)
    if (!rota) throw new Error('Rota não encontrada para gerar o PDF')

    const receipts = await caixaService.getEmployeeReceipts(
      fechamento.funcionario_id,
      rota,
    )

    const allExpenses = await caixaService.getEmployeeExpenses(
      fechamento.funcionario_id,
      rota,
    )
    const expenses = allExpenses.filter((e) => e.saiuDoCaixa)

    const allSettlements = await resumoAcertosService.getSettlements({ rota })
    const settlements = allSettlements.filter(
      (s) => s.employeeId === fechamento.funcionario_id,
    )

    const { data: blob, error } = await supabase.functions.invoke(
      'generate-pdf',
      {
        body: {
          reportType: 'closing-confirmation',
          fechamento,
          receipts,
          expenses,
          settlements,
          format,
          date: new Date().toISOString(),
        },
        responseType: 'blob',
      },
    )

    if (error) throw error

    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Fechamento_${fechamento.id}_${format}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  },
}
