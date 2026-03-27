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
  statusCaixa: 'Aberto' | 'Pendente' | 'Fechado'
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
    // Force precise timestamp for accurate expense tracking
    const exactTimestamp = new Date().toISOString()
    const dataLancamento = exactTimestamp.split('T')[0]

    const { error } = await supabase.from('DESPESAS').insert({
      'Grupo de Despesas': despesa['Grupo de Despesas'],
      Detalhamento: despesa.Detalhamento,
      Valor: despesa.Valor,
      funcionario_id: despesa.funcionario_id,
      Data: exactTimestamp,
      data_lancamento: dataLancamento,
      saiu_do_caixa: despesa.saiu_do_caixa,
      hodometro: despesa.hodometro,
      veiculo_id: despesa.veiculo_id,
      prestador_servico: despesa.prestador_servico,
      tipo_servico: despesa.tipo_servico,
      tipo_combustivel: despesa.tipo_combustivel,
      rota_id: despesa.rota_id,
    })

    if (error) throw error
  },

  async deleteReceipt(id: number) {
    const { error } = await supabase.from('RECEBIMENTOS').delete().eq('id', id)
    if (error) throw error
  },

  async deleteDespesa(id: number) {
    const { error } = await supabase.from('DESPESAS').delete().eq('id', id)
    if (error) throw error
  },

  async getFinancialSummary(filters: {
    rotaId?: number
    startDate?: string
    endDate?: string
  }): Promise<CaixaSummaryRow[]> {
    const { data: employees, error: empError } = await supabase
      .from('FUNCIONARIOS')
      .select('id, nome_completo')

    if (empError) throw empError

    let closureQuery = supabase
      .from('fechamento_caixa')
      .select('funcionario_id, status')
    if (filters.rotaId)
      closureQuery = closureQuery.eq('rota_id', filters.rotaId)
    if (filters.startDate)
      closureQuery = closureQuery.gte('created_at', filters.startDate)
    if (filters.endDate)
      closureQuery = closureQuery.lte(
        'created_at',
        filters.endDate + 'T23:59:59.999Z',
      )

    const { data: closures, error: closureError } = await closureQuery

    if (closureError) throw closureError

    const closureMap = new Map<number, 'Aberto' | 'Fechado'>()
    closures?.forEach((c) =>
      closureMap.set(c.funcionario_id, c.status as 'Aberto' | 'Fechado'),
    )

    const summaryMap = new Map<number, CaixaSummaryRow>()
    employees?.forEach((emp) => {
      const dbStatus = closureMap.get(emp.id) || null
      const hasClosingRecord = closureMap.has(emp.id)

      let statusCaixa: 'Aberto' | 'Pendente' | 'Fechado' = 'Aberto'
      if (dbStatus === 'Fechado') {
        statusCaixa = 'Fechado'
      } else if (dbStatus === 'Aberto') {
        statusCaixa = 'Pendente'
      }

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

    let recQuery = supabase
      .from('RECEBIMENTOS')
      .select('funcionario_id, valor_pago, forma_pagamento, rota_id')
      .gt('valor_pago', 0)
    if (filters.rotaId) recQuery = recQuery.eq('rota_id', filters.rotaId)
    if (filters.startDate)
      recQuery = recQuery.gte('created_at', filters.startDate)
    if (filters.endDate)
      recQuery = recQuery.lte('created_at', filters.endDate + 'T23:59:59.999Z')

    const { data: receipts, error: recError } = await recQuery

    if (recError) throw recError

    receipts?.forEach((rec) => {
      const empId = rec.funcionario_id
      if (summaryMap.has(empId)) {
        const entry = summaryMap.get(empId)!
        entry.totalRecebido += Number(rec.valor_pago)
        if (rec.forma_pagamento === 'Boleto') {
          entry.totalBoleto += Number(rec.valor_pago)
        }
      }
    })

    let expQuery = supabase
      .from('DESPESAS')
      .select('funcionario_id, Valor, saiu_do_caixa, rota_id')
    if (filters.rotaId) expQuery = expQuery.eq('rota_id', filters.rotaId)
    if (filters.startDate) expQuery = expQuery.gte('Data', filters.startDate)
    if (filters.endDate)
      expQuery = expQuery.lte('Data', filters.endDate + 'T23:59:59.999Z')

    const { data: expenses, error: expError } = await expQuery

    if (expError) throw expError

    expenses?.forEach((exp) => {
      if (exp.saiu_do_caixa === false) return

      const empId = exp.funcionario_id
      if (summaryMap.has(empId)) {
        const entry = summaryMap.get(empId)!
        entry.totalDespesas += Number(exp.Valor)
      }
    })

    const result = Array.from(summaryMap.values())
      .map((row) => ({
        ...row,
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

  async getAllReceipts(filters: {
    rotaId?: number
    startDate?: string
    endDate?: string
  }): Promise<ReceiptDetail[]> {
    let query = supabase
      .from('RECEBIMENTOS')
      .select(
        `id, created_at, valor_pago, forma_pagamento, funcionario_id, venda_id, data_pagamento, rota_id, CLIENTES ( "NOME CLIENTE" ), FUNCIONARIOS ( nome_completo )`,
      )
      .gt('valor_pago', 0)
      .order('created_at', { ascending: false })

    if (filters.rotaId) query = query.eq('rota_id', filters.rotaId)
    if (filters.startDate) query = query.gte('created_at', filters.startDate)
    if (filters.endDate)
      query = query.lte('created_at', filters.endDate + 'T23:59:59.999Z')

    const { data, error } = await query

    if (error) throw error

    return (data || []).map((rec: any) => ({
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

  async getAllExpenses(filters: {
    rotaId?: number
    startDate?: string
    endDate?: string
  }): Promise<ExpenseDetail[]> {
    let query = supabase
      .from('DESPESAS')
      .select(`*, FUNCIONARIOS ( nome_completo )`)
      .order('Data', { ascending: false })

    if (filters.rotaId) query = query.eq('rota_id', filters.rotaId)
    if (filters.startDate) query = query.gte('Data', filters.startDate)
    if (filters.endDate)
      query = query.lte('Data', filters.endDate + 'T23:59:59.999Z')

    const { data, error } = await query

    if (error) throw error

    return (data || []).map((exp: any) => ({
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
        rota_id,
        CLIENTES (
          "NOME CLIENTE"
        )
      `,
      )
      .eq('funcionario_id', employeeId)
      .eq('rota_id', rota.id)
      .gt('valor_pago', 0)
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map((rec: any) => ({
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
    const { data, error } = await supabase
      .from('DESPESAS')
      .select('*')
      .eq('funcionario_id', employeeId)
      .eq('rota_id', rota.id)
      .order('Data', { ascending: false })

    if (error) throw error

    return (data || []).map((exp) => ({
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
