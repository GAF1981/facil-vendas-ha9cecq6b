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
        responsavel:FUNCIONARIOS!responsavel_id ( nome_completo )
      `,
      )
      .eq('rota_id', rotaId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as FechamentoCaixa[]
  },

  async createClosing(rota: Rota, funcionarioId: number) {
    // 1. Calculate Financial Totals
    const settlements = await resumoAcertosService.getSettlements(rota)

    // Filter settlements for this employee
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

    // 2. Calculate Payment Totals (Cash, Pix, Cheque)
    const receipts = await caixaService.getEmployeeReceipts(funcionarioId, rota)

    // Filter out 'Boleto'
    const validReceipts = receipts.filter((r) => r.forma !== 'Boleto')

    const valorDinheiro = validReceipts
      .filter((r) => r.forma === 'Dinheiro')
      .reduce((acc, r) => acc + r.valor, 0)

    const valorPix = validReceipts
      .filter((r) => r.forma === 'Pix')
      .reduce((acc, r) => acc + r.valor, 0)

    const valorCheque = validReceipts
      .filter((r) => r.forma === 'Cheque')
      .reduce((acc, r) => acc + r.valor, 0)

    // 3. Calculate Expense Totals
    const expenses = await caixaService.getEmployeeExpenses(funcionarioId, rota)
    const valorDespesas = expenses.reduce((acc, e) => acc + e.valor, 0)

    // 4. Insert Record
    const payload: FechamentoInsert = {
      rota_id: rota.id,
      funcionario_id: funcionarioId,
      venda_total: vendaTotal,
      desconto_total: descontoTotal,
      valor_a_receber: valorAReceber,
      valor_dinheiro: valorDinheiro,
      valor_pix: valorPix,
      valor_cheque: valorCheque,
      valor_despesas: valorDespesas,
      status: 'Aberto',
    }

    const { data, error } = await supabase
      .from('fechamento_caixa')
      .insert(payload)
      .select(`*, funcionario:FUNCIONARIOS!funcionario_id ( nome_completo )`) // Fetch joined data for PDF
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
      | 'despesas_aprovadas',
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
        created_at: new Date().toISOString(), // Update timestamp to confirmation time
      })
      .eq('id', id)

    if (error) throw error
  },

  async checkExistingClosing(rotaId: number, funcionarioId: number) {
    const { count, error } = await supabase
      .from('fechamento_caixa')
      .select('id', { count: 'exact', head: true })
      .eq('rota_id', rotaId)
      .eq('funcionario_id', funcionarioId)

    if (error) throw error
    return (count || 0) > 0
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

  async generateClosingPdf(fechamento: FechamentoCaixa, format: 'A4' | '80mm') {
    const { data: blob, error } = await supabase.functions.invoke(
      'generate-pdf',
      {
        body: {
          reportType: 'closing-confirmation',
          fechamento,
          format,
          date: new Date().toISOString(),
        },
        responseType: 'blob',
      },
    )

    if (error) throw error

    // Create download link
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
