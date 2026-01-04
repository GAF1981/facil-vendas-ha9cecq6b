import { supabase } from '@/lib/supabase/client'
import { DespesaInsert } from '@/types/despesa'
import { Rota } from '@/types/rota'
import { parseISO, isAfter, isBefore, isEqual } from 'date-fns'

export interface CaixaSummaryRow {
  funcionarioId: number
  funcionarioNome: string
  totalRecebido: number
  totalDespesas: number
  saldo: number
}

export interface ReceiptDetail {
  id: number
  data: string
  clienteNome: string
  valor: number
  forma: string
  funcionarioNome?: string // Added for global list
  funcionarioId?: number
}

export interface ExpenseDetail {
  id: number
  data: string
  grupo: string
  detalhamento: string
  valor: number
  funcionarioNome?: string // Added for global list
  funcionarioId?: number
}

export const caixaService = {
  async saveDespesa(despesa: DespesaInsert) {
    const dataToSave = despesa.Data
      ? new Date(despesa.Data).toISOString()
      : new Date().toISOString()

    const { error } = await supabase.from('DESPESAS').insert({
      'Grupo de Despesas': despesa['Grupo de Despesas'],
      Detalhamento: despesa.Detalhamento,
      Valor: despesa.Valor,
      funcionario_id: despesa.funcionario_id,
      Data: dataToSave,
    })

    if (error) throw error
  },

  async getFinancialSummary(rota: Rota): Promise<CaixaSummaryRow[]> {
    const routeStart = parseISO(rota.data_inicio)
    const routeEnd = rota.data_fim ? parseISO(rota.data_fim) : new Date()

    const { data: employees, error: empError } = await supabase
      .from('FUNCIONARIOS')
      .select('id, nome_completo')

    if (empError) throw empError

    const summaryMap = new Map<number, CaixaSummaryRow>()
    employees?.forEach((emp) => {
      summaryMap.set(emp.id, {
        funcionarioId: emp.id,
        funcionarioNome: emp.nome_completo,
        totalRecebido: 0,
        totalDespesas: 0,
        saldo: 0,
      })
    })

    // Added forma_pagamento to selection to filter out Boletos
    const { data: receipts, error: recError } = await supabase
      .from('RECEBIMENTOS')
      .select('funcionario_id, valor_pago, created_at, forma_pagamento')
      .gte('created_at', rota.data_inicio)
      .gt('valor_pago', 0)

    if (recError) throw recError

    receipts?.forEach((rec) => {
      if (!rec.created_at) return

      // Filter out Boleto payments from employee balance
      if (rec.forma_pagamento === 'Boleto') return

      const recDate = parseISO(rec.created_at)

      const isAfterStart =
        isAfter(recDate, routeStart) || isEqual(recDate, routeStart)
      const isBeforeEnd =
        isBefore(recDate, routeEnd) || isEqual(recDate, routeEnd)

      if (isAfterStart && (rota.data_fim ? isBeforeEnd : true)) {
        const empId = rec.funcionario_id
        if (summaryMap.has(empId)) {
          const entry = summaryMap.get(empId)!
          entry.totalRecebido += Number(rec.valor_pago)
        }
      }
    })

    const { data: expenses, error: expError } = await supabase
      .from('DESPESAS')
      .select('funcionario_id, Valor, Data')
      .gte('Data', rota.data_inicio)

    if (expError) throw expError

    expenses?.forEach((exp) => {
      if (!exp.Data) return
      const expDate = parseISO(exp.Data)

      const isAfterStart =
        isAfter(expDate, routeStart) || isEqual(expDate, routeStart)
      const isBeforeEnd =
        isBefore(expDate, routeEnd) || isEqual(expDate, routeEnd)

      if (isAfterStart && (rota.data_fim ? isBeforeEnd : true)) {
        const empId = exp.funcionario_id
        if (summaryMap.has(empId)) {
          const entry = summaryMap.get(empId)!
          entry.totalDespesas += Number(exp.Valor)
        }
      }
    })

    const result = Array.from(summaryMap.values())
      .map((row) => ({
        ...row,
        saldo: row.totalRecebido - row.totalDespesas,
      }))
      .filter(
        (row) =>
          Math.abs(row.totalRecebido) > 0.01 ||
          Math.abs(row.totalDespesas) > 0.01,
      )
      .sort((a, b) => a.funcionarioNome.localeCompare(b.funcionarioNome))

    return result
  },

  async getAllReceipts(rota: Rota): Promise<ReceiptDetail[]> {
    const routeStart = parseISO(rota.data_inicio)
    const routeEnd = rota.data_fim ? parseISO(rota.data_fim) : new Date()

    const { data, error } = await supabase
      .from('RECEBIMENTOS')
      .select(
        `
        id,
        created_at,
        valor_pago,
        forma_pagamento,
        funcionario_id,
        CLIENTES ( "NOME CLIENTE" ),
        FUNCIONARIOS ( nome_completo )
      `,
      )
      .gte('created_at', rota.data_inicio)
      .gt('valor_pago', 0)
      .order('created_at', { ascending: false })

    if (error) throw error

    const filtered = (data || []).filter((rec) => {
      if (!rec.created_at) return false
      const recDate = parseISO(rec.created_at)
      const isAfterStart =
        isAfter(recDate, routeStart) || isEqual(recDate, routeStart)
      const isBeforeEnd =
        isBefore(recDate, routeEnd) || isEqual(recDate, routeEnd)
      return isAfterStart && (rota.data_fim ? isBeforeEnd : true)
    })

    return filtered.map((rec: any) => ({
      id: rec.id,
      data: rec.created_at,
      clienteNome: rec.CLIENTES?.['NOME CLIENTE'] || 'N/D',
      valor: rec.valor_pago,
      forma: rec.forma_pagamento,
      funcionarioNome: rec.FUNCIONARIOS?.nome_completo || 'N/D',
      funcionarioId: rec.funcionario_id,
    }))
  },

  async getAllExpenses(rota: Rota): Promise<ExpenseDetail[]> {
    const routeStart = parseISO(rota.data_inicio)
    const routeEnd = rota.data_fim ? parseISO(rota.data_fim) : new Date()

    const { data, error } = await supabase
      .from('DESPESAS')
      .select(
        `
        *,
        FUNCIONARIOS ( nome_completo )
      `,
      )
      .gte('Data', rota.data_inicio)
      .order('Data', { ascending: false })

    if (error) throw error

    const filtered = (data || []).filter((exp) => {
      if (!exp.Data) return false
      const expDate = parseISO(exp.Data)
      const isAfterStart =
        isAfter(expDate, routeStart) || isEqual(expDate, routeStart)
      const isBeforeEnd =
        isBefore(expDate, routeEnd) || isEqual(expDate, routeEnd)
      return isAfterStart && (rota.data_fim ? isBeforeEnd : true)
    })

    return filtered.map((exp: any) => ({
      id: exp.id,
      data: exp.Data || '',
      grupo: exp['Grupo de Despesas'],
      detalhamento: exp.Detalhamento,
      valor: Number(exp.Valor),
      funcionarioNome: exp.FUNCIONARIOS?.nome_completo || 'N/D',
      funcionarioId: exp.funcionario_id,
    }))
  },

  async getEmployeeReceipts(
    employeeId: number,
    rota: Rota,
  ): Promise<ReceiptDetail[]> {
    const routeStart = parseISO(rota.data_inicio)
    const routeEnd = rota.data_fim ? parseISO(rota.data_fim) : new Date()

    const { data, error } = await supabase
      .from('RECEBIMENTOS')
      .select(
        `
        id,
        created_at,
        valor_pago,
        forma_pagamento,
        CLIENTES (
          "NOME CLIENTE"
        )
      `,
      )
      .eq('funcionario_id', employeeId)
      .gte('created_at', rota.data_inicio)
      .gt('valor_pago', 0)
      .order('created_at', { ascending: false })

    if (error) throw error

    const filtered = (data || []).filter((rec) => {
      if (!rec.created_at) return false
      const recDate = parseISO(rec.created_at)
      const isAfterStart =
        isAfter(recDate, routeStart) || isEqual(recDate, routeStart)
      const isBeforeEnd =
        isBefore(recDate, routeEnd) || isEqual(recDate, routeEnd)
      return isAfterStart && (rota.data_fim ? isBeforeEnd : true)
    })

    return filtered.map((rec: any) => ({
      id: rec.id,
      data: rec.created_at,
      clienteNome: rec.CLIENTES?.['NOME CLIENTE'] || 'N/D',
      valor: rec.valor_pago,
      forma: rec.forma_pagamento,
    }))
  },

  async getEmployeeExpenses(
    employeeId: number,
    rota: Rota,
  ): Promise<ExpenseDetail[]> {
    const routeStart = parseISO(rota.data_inicio)
    const routeEnd = rota.data_fim ? parseISO(rota.data_fim) : new Date()

    const { data, error } = await supabase
      .from('DESPESAS')
      .select('*')
      .eq('funcionario_id', employeeId)
      .gte('Data', rota.data_inicio)
      .order('Data', { ascending: false })

    if (error) throw error

    const filtered = (data || []).filter((exp) => {
      if (!exp.Data) return false
      const expDate = parseISO(exp.Data)
      const isAfterStart =
        isAfter(expDate, routeStart) || isEqual(expDate, routeStart)
      const isBeforeEnd =
        isBefore(expDate, routeEnd) || isEqual(expDate, routeEnd)
      return isAfterStart && (rota.data_fim ? isBeforeEnd : true)
    })

    return filtered.map((exp) => ({
      id: exp.id,
      data: exp.Data || '',
      grupo: exp['Grupo de Despesas'],
      detalhamento: exp.Detalhamento,
      valor: Number(exp.Valor),
    }))
  },
}
