import { supabase } from '@/lib/supabase/client'
import { DespesaInsert } from '@/types/despesa'
import { Rota } from '@/types/rota'
import { parseISO, isAfter, isBefore, isEqual } from 'date-fns'
import { getBrazilDateString } from '@/lib/dateUtils'

export interface CaixaSummaryRow {
  funcionarioId: number
  funcionarioNome: string
  totalRecebido: number
  totalBoleto: number
  totalDespesas: number
  saldo: number
  statusCaixa: 'Aberto' | 'Fechado'
  hasClosingRecord: boolean
  dbStatus: 'Aberto' | 'Fechado' | null
}

export interface ReceiptDetail {
  id: number
  data: string
  clienteNome: string
  valor: number
  forma: string
  funcionarioNome?: string
  funcionarioId?: number
  orderId?: number
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
  employeeId?: number
  gasolineValue: number
  initialOdometer: number | null
  finalOdometer: number
  costPerKm: number | null
  vehiclePlate: string | null
  vehicleId: number | null
  fuelType?: string
}

export const caixaService = {
  async saveDespesa(despesa: DespesaInsert) {
    let dataToSave: string

    if (despesa.Data) {
      dataToSave = new Date(`${despesa.Data}T12:00:00`).toISOString()
    } else {
      const brazilDate = getBrazilDateString()
      dataToSave = new Date(`${brazilDate}T12:00:00`).toISOString()
    }

    const { error } = await supabase.from('DESPESAS').insert({
      'Grupo de Despesas': despesa['Grupo de Despesas'],
      Detalhamento: despesa.Detalhamento,
      Valor: despesa.Valor,
      funcionario_id: despesa.funcionario_id,
      Data: dataToSave,
      saiu_do_caixa: despesa.saiu_do_caixa,
      hodometro: despesa.hodometro,
      veiculo_id: despesa.veiculo_id,
      prestador_servico: despesa.prestador_servico,
      tipo_servico: despesa.tipo_servico,
      tipo_combustivel: despesa.tipo_combustivel,
    })

    if (error) throw error
  },

  async getFinancialSummary(rota: Rota): Promise<CaixaSummaryRow[]> {
    const routeStart = parseISO(rota.data_inicio)
    const routeEnd = rota.data_fim ? parseISO(rota.data_fim) : new Date()

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
      const dbStatus = closureMap.get(emp.id) || null
      const hasClosingRecord = closureMap.has(emp.id)
      const statusCaixa = dbStatus === 'Fechado' ? 'Fechado' : 'Aberto'

      summaryMap.set(emp.id, {
        funcionarioId: emp.id,
        funcionarioNome: emp.nome_completo,
        totalRecebido: 0,
        totalBoleto: 0,
        totalDespesas: 0,
        saldo: 0,
        statusCaixa,
        hasClosingRecord,
        dbStatus,
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

      const recDate = parseISO(rec.created_at)

      const isAfterStart =
        isAfter(recDate, routeStart) || isEqual(recDate, routeStart)

      const isBeforeEnd = rota.data_fim
        ? isBefore(recDate, routeEnd) || isEqual(recDate, routeEnd)
        : true

      if (isAfterStart && isBeforeEnd) {
        const empId = rec.funcionario_id
        if (summaryMap.has(empId)) {
          const entry = summaryMap.get(empId)!
          entry.totalRecebido += Number(rec.valor_pago)
          if (rec.forma_pagamento === 'Boleto') {
            entry.totalBoleto += Number(rec.valor_pago)
          }
        }
      }
    })

    // 4. Expenses
    const fetchStartDate = rota.data_inicio.split('T')[0] // YYYY-MM-DD

    const { data: expenses, error: expError } = await supabase
      .from('DESPESAS')
      .select('funcionario_id, Valor, Data, saiu_do_caixa')
      .gte('Data', fetchStartDate)

    if (expError) throw expError

    expenses?.forEach((exp) => {
      if (!exp.Data) return
      if (exp.saiu_do_caixa === false) return

      const expDayStr = exp.Data.split('T')[0]
      const routeStartDayStr = rota.data_inicio.split('T')[0]
      const routeEndDayStr = rota.data_fim ? rota.data_fim.split('T')[0] : null

      const isAfterOrSameStart = expDayStr >= routeStartDayStr
      const isBeforeOrSameEnd = routeEndDayStr
        ? expDayStr <= routeEndDayStr
        : true

      if (isAfterOrSameStart && isBeforeOrSameEnd) {
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
        // Saldo reflects CASH balance, so remove Boletos
        saldo: row.totalRecebido - row.totalDespesas - row.totalBoleto,
      }))
      .filter(
        (row) =>
          Math.abs(row.totalRecebido) > 0.01 ||
          Math.abs(row.totalDespesas) > 0.01 ||
          row.hasClosingRecord,
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
        venda_id,
        data_pagamento,
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

      const isBeforeEnd = rota.data_fim
        ? isBefore(recDate, routeEnd) || isEqual(recDate, routeEnd)
        : true

      return isAfterStart && isBeforeEnd
    })

    return filtered.map((rec: any) => ({
      id: rec.id,
      data: rec.created_at,
      clienteNome: rec.CLIENTES?.['NOME CLIENTE'] || 'N/D',
      valor: rec.valor_pago,
      forma: rec.forma_pagamento,
      funcionarioNome: rec.FUNCIONARIOS?.nome_completo || 'N/D',
      funcionarioId: rec.funcionario_id,
      orderId: rec.venda_id,
    }))
  },

  async getAllExpenses(rota: Rota): Promise<ExpenseDetail[]> {
    const fetchStartDate = rota.data_inicio.split('T')[0]

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

      const expDayStr = exp.Data.split('T')[0]
      const routeStartDayStr = rota.data_inicio.split('T')[0]
      const routeEndDayStr = rota.data_fim ? rota.data_fim.split('T')[0] : null

      const isAfterOrSameStart = expDayStr >= routeStartDayStr
      const isBeforeOrSameEnd = routeEndDayStr
        ? expDayStr <= routeEndDayStr
        : true

      return isAfterOrSameStart && isBeforeOrSameEnd
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
        data_pagamento,
        valor_pago,
        forma_pagamento,
        venda_id,
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

      const isBeforeEnd = rota.data_fim
        ? isBefore(recDate, routeEnd) || isEqual(recDate, routeEnd)
        : true

      return isAfterStart && isBeforeEnd
    })

    return filtered.map((rec: any) => ({
      id: rec.id,
      data: rec.created_at,
      clienteNome: rec.CLIENTES?.['NOME CLIENTE'] || 'N/D',
      valor: rec.valor_pago,
      forma: rec.forma_pagamento,
      orderId: rec.venda_id,
    }))
  },

  async getEmployeeExpenses(
    employeeId: number,
    rota: Rota,
  ): Promise<ExpenseDetail[]> {
    const fetchStartDate = rota.data_inicio.split('T')[0]

    const { data, error } = await supabase
      .from('DESPESAS')
      .select('*')
      .eq('funcionario_id', employeeId)
      .gte('Data', fetchStartDate)
      .order('Data', { ascending: false })

    if (error) throw error

    const filtered = (data || []).filter((exp) => {
      if (!exp.Data) return false

      const expDayStr = exp.Data.split('T')[0]
      const routeStartDayStr = rota.data_inicio.split('T')[0]
      const routeEndDayStr = rota.data_fim ? rota.data_fim.split('T')[0] : null

      const isAfterOrSameStart = expDayStr >= routeStartDayStr
      const isBeforeOrSameEnd = routeEndDayStr
        ? expDayStr <= routeEndDayStr
        : true

      return isAfterOrSameStart && isBeforeOrSameEnd
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

  async getFuelReportData(filters?: {
    startDate?: string
    endDate?: string
    vehicleId?: string
    employeeId?: string
  }): Promise<FuelReportRow[]> {
    let query = supabase
      .from('DESPESAS')
      .select(
        `
        id,
        Data,
        Valor,
        hodometro,
        funcionario_id,
        veiculo_id,
        tipo_combustivel,
        FUNCIONARIOS ( nome_completo ),
        VEICULOS ( placa )
      `,
      )
      .or(
        'Grupo de Despesas.eq.Gasolina,Grupo de Despesas.eq.Combustível,Grupo de Despesas.eq.Abastecimento',
      )

    if (filters?.startDate) {
      query = query.gte('Data', filters.startDate)
    }
    if (filters?.endDate) {
      query = query.lte('Data', filters.endDate)
    }
    if (filters?.vehicleId && filters.vehicleId !== 'todos') {
      query = query.eq('veiculo_id', filters.vehicleId)
    }
    if (filters?.employeeId && filters.employeeId !== 'todos') {
      query = query.eq('funcionario_id', filters.employeeId)
    }

    const { data, error } = await query.order('Data', { ascending: true })

    if (error) throw error

    const groupedData = new Map<string, any[]>()

    data?.forEach((row: any) => {
      const key = row.veiculo_id
        ? `V-${row.veiculo_id}`
        : `E-${row.funcionario_id}`

      if (!groupedData.has(key)) groupedData.set(key, [])
      groupedData.get(key)?.push(row)
    })

    const reportRows: FuelReportRow[] = []

    groupedData.forEach((entries) => {
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
          if (distance > 0 && previous.Valor > 0) {
            costPerKm = distance / previous.Valor
          }
        }

        reportRows.push({
          id: current.id,
          date: current.Data,
          employeeName: current.FUNCIONARIOS?.nome_completo || 'Unknown',
          employeeId: current.funcionario_id,
          gasolineValue: Number(current.Valor),
          initialOdometer: initialOdo,
          finalOdometer: Number(current.hodometro),
          costPerKm: costPerKm,
          vehiclePlate: current.VEICULOS?.placa || null,
          vehicleId: current.veiculo_id || null,
          fuelType: current.tipo_combustivel,
        })
      }
    })

    return reportRows.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )
  },
}
