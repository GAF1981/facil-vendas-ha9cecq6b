import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDividasManuaisStore } from '@/stores/useDividasManuaisStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Plus, Search, HandCoins, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'
import { DividasManuaisTable } from '@/components/dividas/DividasManuaisTable'
import { DividaManualFormDialog } from '@/components/dividas/DividaManualFormDialog'

export default function DividasManuaisPage() {
  const [searchParams] = useSearchParams()
  const { dividas, fetchDividas, loading } = useDividasManuaisStore()
  const [isFormOpen, setIsFormOpen] = useState(false)

  // Filters
  const [filterCliente, setFilterCliente] = useState(
    searchParams.get('cliente') || '',
  )
  const [filterCobranca, setFilterCobranca] = useState('')
  const [filterTipo, setFilterTipo] = useState('todos')
  const [filterFormaPgto, setFilterFormaPgto] = useState('todos')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [filterVencimento, setFilterVencimento] = useState('')
  const [filterDataComb, setFilterDataComb] = useState('')
  const [filterValor, setFilterValor] = useState('')

  useEffect(() => {
    fetchDividas()
  }, [fetchDividas])

  const filteredData = useMemo(() => {
    return dividas.filter((d) => {
      // Cliente
      if (filterCliente) {
        const term = filterCliente.toLowerCase()
        const matchName = d.CLIENTES?.['NOME CLIENTE']
          ?.toLowerCase()
          .includes(term)
        const matchId = d.cliente_id.toString().includes(term)
        if (!matchName && !matchId) return false
      }

      // Numero cobrança
      if (
        filterCobranca &&
        `C${d.cobranca_seq}`.toLowerCase() !== filterCobranca.toLowerCase()
      )
        return false

      // Tipo cliente
      if (filterTipo !== 'todos') {
        const t = d.CLIENTES?.['TIPO DE CLIENTE']?.toLowerCase() || ''
        if (filterTipo === 'ativo' && !t.includes('ativo')) return false
        if (filterTipo === 'inativo' && !t.includes('inativo')) return false
      }

      // Forma Pagamento
      if (filterFormaPgto !== 'todos' && d.forma_pagamento !== filterFormaPgto)
        return false

      // Status
      const isPaid = d.valor_pago >= d.valor_parcela
      const isOverdue =
        !isPaid &&
        new Date(d.vencimento) < new Date(new Date().setHours(0, 0, 0, 0))
      const status = isPaid ? 'pago' : isOverdue ? 'vencido' : 'a vencer'
      if (filterStatus !== 'todos' && status !== filterStatus) return false

      // Valor
      if (filterValor) {
        const deb = d.valor_parcela - d.valor_pago
        if (deb.toString() !== filterValor) return false
      }

      // Vencimento
      if (filterVencimento && !d.vencimento.startsWith(filterVencimento))
        return false

      // Data combinada
      if (filterDataComb && !d.data_combinada?.startsWith(filterDataComb))
        return false

      return true
    })
  }, [
    dividas,
    filterCliente,
    filterCobranca,
    filterTipo,
    filterFormaPgto,
    filterStatus,
    filterVencimento,
    filterDataComb,
    filterValor,
  ])

  const totalDivida = filteredData.reduce(
    (acc, curr) => acc + Math.max(0, curr.valor_parcela - curr.valor_pago),
    0,
  )
  const totalPago = filteredData.reduce((acc, curr) => acc + curr.valor_pago, 0)

  return (
    <div className="space-y-6 animate-fade-in pb-10 max-w-[1600px] mx-auto p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Dívida Inclusão Manual
          </h1>
          <p className="text-muted-foreground">
            Central de controle de dívidas avulsas.
          </p>
        </div>
        <Button
          onClick={() => setIsFormOpen(true)}
          className="bg-primary text-primary-foreground"
        >
          <Plus className="mr-2 h-4 w-4" /> Nova Dívida
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-red-500 to-rose-600 text-white border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">
              Saldo de Dívida
            </CardTitle>
            <HandCoins className="h-4 w-4 opacity-75" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {formatCurrency(totalDivida)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500 to-green-600 text-white border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Valor Pago</CardTitle>
            <DollarSign className="h-4 w-4 opacity-75" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {formatCurrency(totalPago)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">
                Cliente (Nome ou Cód)
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente..."
                  className="pl-8 h-8 text-xs"
                  value={filterCliente}
                  onChange={(e) => setFilterCliente(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Nº Cobrança (C...)</label>
              <Input
                placeholder="Ex: C1"
                className="h-8 text-xs"
                value={filterCobranca}
                onChange={(e) => setFilterCobranca(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Tipo Cliente</label>
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">F. Pagamento</label>
              <Select
                value={filterFormaPgto}
                onValueChange={setFilterFormaPgto}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="DINHEIRO">DINHEIRO</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="BOLETO">BOLETO</SelectItem>
                  <SelectItem value="CARTÃO">CARTÃO</SelectItem>
                  <SelectItem value="CHEQUE">CHEQUE</SelectItem>
                  <SelectItem value="PRAZO">PRAZO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="a vencer">A Vencer</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Valor da Dívida</label>
              <Input
                type="number"
                placeholder="Ex: 50.00"
                className="h-8 text-xs"
                value={filterValor}
                onChange={(e) => setFilterValor(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Vencimento</label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={filterVencimento}
                onChange={(e) => setFilterVencimento(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">Data Combinada</label>
              <Input
                type="date"
                className="h-8 text-xs"
                value={filterDataComb}
                onChange={(e) => setFilterDataComb(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <DividasManuaisTable data={filteredData} loading={loading} />

      <DividaManualFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} />
    </div>
  )
}
