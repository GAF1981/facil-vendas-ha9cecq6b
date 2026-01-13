import { supabase } from '@/lib/supabase/client'
import { DespesaInsert } from '@/types/despesa'
import { Rota } from '@/types/rota'
import {
  parseISO,
  isAfter,
  isBefore,
  isEqual,
  startOfDay,
  format,
} from 'date-fns'

export interface CaixaSummaryRow {
  funcionarioId: number
  funcionarioNome: string
  totalRecebido: number
  totalDespesas: number
  saldo: number
  statusCaixa: 'Aberto' | 'Fechado'
}

export interface ReceiptDetail {
  id: number
  data: string
  clienteNome: string
  valor: number
  forma: string
  funcionarioNome?: string
  funcionarioId?: number
}

export interface ExpenseDetail {
  id: number
  data: string
  grupo: string
  detalhamento: string
  valor: number
  funcionarioNome?: string
  funcionarioId?: number
  saiuDoCaixa: boolean
  hodometro?: number | null
}

export interface FuelReportRow {
  id: number
  date: string
  employeeName: string
  gasolineValue: number
  initialOdometer: number | null
  finalOdometer: number
  costPerKm: number | null
}

export const caixaService = {
  async saveDespesa(despesa: DespesaInsert) {
    // Fix: Save using Local Time (Brazil) converted to ISO safe string
    // This ensures that when we select "Today" in UI (e.g., 2023-10-25),
    // it is stored as 2023-10-25T12:00:00-03:00 roughly, preserving the day.
    let dataToSave: string

    if (despesa.Data) {
      // If date is provided (YYYY-MM-DD), append Noon to be safe against timezone shifts
      dataToSave = new Date(`${despesa.Data}T12:00:00`).toISOString()
    } else {
      // If no date (Today), get today in SP timezone YYYY-MM-DD
      const todaySP = new Date().toLocaleDateString('en-CA', {
        timeZone: 'America/Sao_Paulo',
      })
      dataToSave = new Date(`${todaySP}T12:00:00`).toISOString()
    }

    const { error } = await supabase.from('DESPESAS').insert({
      'Grupo de Despesas': despesa['Grupo de Despesas'],
      Detalhamento: despesa.Detalhamento,
      Valor: despesa.Valor,
      funcionario_id: despesa.funcionario_id,
      Data: dataToSave,
      saiu_do_caixa: despesa.saiu_do_caixa,
      hodometro: despesa.hodometro,
    })

    if (error) throw error
  },

  async getFinancialSummary(rota: Rota): Promise<CaixaSummaryRow[]> {
    const routeStart = parseISO(rota.data_inicio)
    const routeEnd = rota.data_fim ? parseISO(rota.data_fim) : new Date()

    // Normalize for day comparison
    const routeStartDay = startOfDay(routeStart)
    const routeEndDay = startOfDay(routeEnd)

    // 1. Fetch Employees
    const { data: employees, error: empError } = await supabase
      .from('FUNCIONARIOS')
      .select('id, nome_completo')

    if (empError) throw empError

    // 2. Fetch Closure Statuses for this Route
    const { data: closures, error: closureError } = await supabase
      .from('fechamento_caixa')
      .select('funcionario_id, status')
      .eq('rota_id', rota.id)

    if (closureError) throw closureError

    const closureMap = new Map<number, 'Aberto' | 'Fechado'>()
    closures?.forEach((c) =>
      closureMap.set(c.funcionario_id, c.status as 'Aberto' | 'Fechado'),
    )

    const summaryMap = new Map<number, CaixaSummaryRow>()
    employees?.forEach((emp) => {
      const dbStatus = closureMap.get(emp.id)
      const statusCaixa = dbStatus === 'Fechado' ? 'Fechado' : 'Aberto'

      summaryMap.set(emp.id, {
        funcionarioId: emp.id,
        funcionarioNome: emp.nome_completo,
        totalRecebido: 0,
        totalDespesas: 0,
        saldo: 0,
        statusCaixa,
      })
    })

    // 3. Receipts
    const { data: receipts, error: recError } = await supabase
      .from('RECEBIMENTOS')
      .select('funcionario_id, valor_pago, created_at, forma_pagamento')
      .gte('created_at', rota.data_inicio)
      .gt('valor_pago', 0)

    if (recError) throw recError

    receipts?.forEach((rec) => {
      if (!rec.created_at) return
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

    // 4. Expenses
    // Broaden fetch to ensure we catch all expenses for the day
    const fetchStartDate = format(routeStartDay, 'yyyy-MM-dd')

    const { data: expenses, error: expError } = await supabase
      .from('DESPESAS')
      .select('funcionario_id, Valor, Data, saiu_do_caixa')
      .gte('Data', fetchStartDate)

    if (expError) throw expError

    expenses?.forEach((exp) => {
      if (!exp.Data) return
      // Only count expenses that explicitly came out of the cashier for TOTALS
      if (exp.saiu_do_caixa === false) return

      const expDate = parseISO(exp.Data)
      const expDay = startOfDay(expDate)

      // Check if expense day is same or after route start day
      const isAfterOrSameStartDay =
        isAfter(expDay, routeStartDay) || isEqual(expDay, routeStartDay)

      // If route is closed, check if expense day is same or before route end day
      const isBeforeOrSameEndDay = rota.data_fim
        ? isBefore(expDay, routeEndDay) || isEqual(expDay, routeEndDay)
        : true

      if (isAfterOrSameStartDay && isBeforeOrSameEndDay) {
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
          Math.abs(row.totalDespesas) > 0.01 ||
          row.statusCaixa === 'Fechado',
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
    const routeStartDay = startOfDay(routeStart)
    const routeEnd = rota.data_fim ? parseISO(rota.data_fim) : new Date()
    const routeEndDay = startOfDay(routeEnd)

    const fetchStartDate = format(routeStartDay, 'yyyy-MM-dd')

    const { data, error } = await supabase
      .from('DESPESAS')
      .select(
        `
        *,
        FUNCIONARIOS ( nome_completo )
      `,
      )
      .gte('Data', fetchStartDate)
      .order('Data', { ascending: false })

    if (error) throw error

    const filtered = (data || []).filter((exp) => {
      if (!exp.Data) return false
      const expDate = parseISO(exp.Data)
      const expDay = startOfDay(expDate)

      const isAfterOrSameStartDay =
        isAfter(expDay, routeStartDay) || isEqual(expDay, routeStartDay)
      const isBeforeOrSameEndDay = rota.data_fim
        ? isBefore(expDay, routeEndDay) || isEqual(expDay, routeEndDay)
        : true

      return isAfterOrSameStartDay && isBeforeOrSameEndDay
    })

    return filtered.map((exp: any) => ({
      id: exp.id,
      data: exp.Data || '',
      grupo: exp['Grupo de Despesas'],
      detalhamento: exp.Detalhamento,
      valor: Number(exp.Valor),
      funcionarioNome: exp.FUNCIONARIOS?.nome_completo || 'N/D',
      funcionarioId: exp.funcionario_id,
      saiuDoCaixa: exp.saiu_do_caixa,
      hodometro: exp.hodometro,
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
    const routeStartDay = startOfDay(routeStart)
    const routeEnd = rota.data_fim ? parseISO(rota.data_fim) : new Date()
    const routeEndDay = startOfDay(routeEnd)

    const fetchStartDate = format(routeStartDay, 'yyyy-MM-dd')

    const { data, error } = await supabase
      .from('DESPESAS')
      .select('*')
      .eq('funcionario_id', employeeId)
      .gte('Data', fetchStartDate)
      .order('Data', { ascending: false })

    if (error) throw error

    const filtered = (data || []).filter((exp) => {
      if (!exp.Data) return false
      const expDate = parseISO(exp.Data)
      const expDay = startOfDay(expDate)

      const isAfterOrSameStartDay =
        isAfter(expDay, routeStartDay) || isEqual(expDay, routeStartDay)
      const isBeforeOrSameEndDay = rota.data_fim
        ? isBefore(expDay, routeEndDay) || isEqual(expDay, routeEndDay)
        : true

      return isAfterOrSameStartDay && isBeforeOrSameEndDay
    })

    return filtered.map((exp) => ({
      id: exp.id,
      data: exp.Data || '',
      grupo: exp['Grupo de Despesas'],
      detalhamento: exp.Detalhamento,
      valor: Number(exp.Valor),
      saiuDoCaixa: exp.saiu_do_caixa,
      hodometro: exp.hodometro,
    }))
  },

  // ... (rest of the file remains unchanged)
  async getFuelReportData(): Promise<FuelReportRow[]> {
    const { data, error } = await supabase
      .from('DESPESAS')
      .select(
        `
        id,
        Data,
        Valor,
        hodometro,
        funcionario_id,
        FUNCIONARIOS ( nome_completo )
      `,
      )
      .eq('Grupo de Despesas', 'Gasolina')
      .order('Data', { ascending: true }) // Sorted by date to calculate distances

    if (error) throw error

    // Group by Employee to calculate odometer differences per car/person
    const groupedByEmployee = new Map<number, any[]>()
    data?.forEach((row: any) => {
      const eid = row.funcionario_id
      if (!groupedByEmployee.has(eid)) groupedByEmployee.set(eid, [])
      groupedByEmployee.get(eid)?.push(row)
    })

    const reportRows: FuelReportRow[] = []

    groupedByEmployee.forEach((entries) => {
      // Sort each employee's entries by Date ascending (just to be safe)
      entries.sort(
        (a, b) => new Date(a.Data).getTime() - new Date(b.Data).getTime(),
      )

      for (let i = 0; i < entries.length; i++) {
        const current = entries[i]
        const previous = i > 0 ? entries[i - 1] : null

        let initialOdo = null
        let costPerKm = null

        if (previous && previous.hodometro && current.hodometro) {
          initialOdo = previous.hodometro
          const distance = current.hodometro - initialOdo
          if (distance > 0) {
            costPerKm = current.Valor / distance
          }
        }

        reportRows.push({
          id: current.id,
          date: current.Data,
          employeeName: current.FUNCIONARIOS?.nome_completo || 'Unknown',
          gasolineValue: Number(current.Valor),
          initialOdometer: initialOdo,
          finalOdometer: Number(current.hodometro),
          costPerKm: costPerKm,
        })
      }
    })

    // Return sorted by date descending for report view
    return reportRows.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
  },
}
