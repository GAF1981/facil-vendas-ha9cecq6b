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
    // Fetch settlement summaries to get sales, discounts and debts
    // Note: getSettlements calculates everything for the route
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
    // We use caixaService to get receipts strictly for this employee and route period
    const receipts = await caixaService.getEmployeeReceipts(funcionarioId, rota)

    // Filter out 'Boleto' as it is not physical cash for closing
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

    // 3. Insert Record
    const payload: FechamentoInsert = {
      rota_id: rota.id,
      funcionario_id: funcionarioId,
      venda_total: vendaTotal,
      desconto_total: descontoTotal,
      valor_a_receber: valorAReceber,
      valor_dinheiro: valorDinheiro,
      valor_pix: valorPix,
      valor_cheque: valorCheque,
      status: 'Aberto',
    }

    const { data, error } = await supabase
      .from('fechamento_caixa')
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    return data as FechamentoCaixa
  },

  async updateApproval(
    id: number,
    field: 'dinheiro_aprovado' | 'pix_aprovado' | 'cheque_aprovado',
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
}
