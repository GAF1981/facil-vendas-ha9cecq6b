import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDividasManuaisStore } from '@/stores/useDividasManuaisStore'
import { DividaManualFormDialog } from '@/components/dividas/DividaManualFormDialog'
import { formatCurrency } from '@/lib/formatters'
import {
  CreditCard,
  Plus,
  Search,
  FileText,
  Banknote,
  Eraser,
  Pencil,
  Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { parseISO, format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'

export default function DividasManuaisPage() {
  const { dividas, fetchDividas, deleteDivida } = useDividasManuaisStore()
  const { toast } = useToast()

  const [search, setSearch] = useState('')
  const [tipoClienteFilter, setTipoClienteFilter] = useState('todos')
  const [valorParcFilter, setValorParcFilter] = useState('todos')
  const [formaCobrancaFilter, setFormaCobrancaFilter] = useState('todos')
  const [dataCombinadaFilter, setDataCombinadaFilter] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState<any>(null)

  useEffect(() => {
    fetchDividas()
  }, [fetchDividas])

  const uniqueTipos = useMemo(() => {
    const tipos = new Set<string>()
    dividas.forEach((d) => {
      if (d.CLIENTES?.['TIPO DE CLIENTE']) {
        tipos.add(d.CLIENTES['TIPO DE CLIENTE'])
      }
    })
    return Array.from(tipos).sort()
  }, [dividas])

  const uniqueValores = useMemo(() => {
    const vals = new Set<number>()
    dividas.forEach((d) => vals.add(d.valor_parcela))
    return Array.from(vals).sort((a, b) => a - b)
  }, [dividas])

  const uniqueFormasCobranca = useMemo(() => {
    const formas = new Set<string>()
    dividas.forEach((d) => {
      if (d.forma_cobranca) formas.add(d.forma_cobranca)
    })
    return Array.from(formas).sort()
  }, [dividas])

  const filteredData = useMemo(() => {
    return dividas.filter((d) => {
      const cName = (d.CLIENTES?.['NOME CLIENTE'] || '').toLowerCase()
      const matchesSearch =
        search === '' ||
        cName.includes(search.toLowerCase()) ||
        d.cliente_id.toString().includes(search)

      const matchesTipo =
        tipoClienteFilter === 'todos' ||
        d.CLIENTES?.['TIPO DE CLIENTE'] === tipoClienteFilter

      const matchesValor =
        valorParcFilter === 'todos' ||
        d.valor_parcela.toString() === valorParcFilter

      const matchesForma =
        formaCobrancaFilter === 'todos' ||
        (formaCobrancaFilter === 'VAZIO' && !d.forma_cobranca) ||
        d.forma_cobranca === formaCobrancaFilter

      const matchesDataComb =
        dataCombinadaFilter === '' || d.data_combinada === dataCombinadaFilter

      return (
        matchesSearch &&
        matchesTipo &&
        matchesValor &&
        matchesForma &&
        matchesDataComb
      )
    })
  }, [
    dividas,
    search,
    tipoClienteFilter,
    valorParcFilter,
    formaCobrancaFilter,
    dataCombinadaFilter,
  ])

  const { saldoTotal, valorPagoTotal } = useMemo(() => {
    let saldo = 0
    let pago = 0
    filteredData.forEach((d) => {
      saldo += Math.max(0, d.valor_parcela - d.valor_pago)
      pago += d.valor_pago
    })
    return { saldoTotal: saldo, valorPagoTotal: pago }
  }, [filteredData])

  const resetFilters = () => {
    setSearch('')
    setTipoClienteFilter('todos')
    setValorParcFilter('todos')
    setFormaCobrancaFilter('todos')
    setDataCombinadaFilter('')
  }

  const handleDelete = async (id: number) => {
    if (confirm('Deseja realmente excluir esta dívida?')) {
      try {
        await deleteDivida(id)
        toast({ title: 'Sucesso', description: 'Dívida excluída.' })
      } catch (e: any) {
        toast({
          title: 'Erro',
          description: e.message,
          variant: 'destructive',
        })
      }
    }
  }

  const openEdit = (debt: any) => {
    setSelectedDebt(debt)
    setIsModalOpen(true)
  }

  const openNew = () => {
    setSelectedDebt(null)
    setIsModalOpen(true)
  }

  const getStatus = (d: any) => {
    if (d.valor_pago >= d.valor_parcela) return 'PAGO'
    if (d.vencimento < new Date().toISOString().substring(0, 10))
      return 'VENCIDO'
    return 'A VENCER'
  }

  return (
    <div className="space-y-6 animate-fade-in p-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="h-8 w-8 text-primary" />
            Central de Dívida
          </h1>
          <p className="text-muted-foreground">
            Gestão de dívidas manuais, inclusão e parcelamento de acordos.
          </p>
        </div>
        <Button onClick={openNew} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Incluir Dívida Manual
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Saldo de Dívida
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              R$ {formatCurrency(saldoTotal)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Pago</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {formatCurrency(valorPagoTotal)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-4 items-center bg-muted/30 p-2 rounded-md">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              value={tipoClienteFilter}
              onValueChange={setTipoClienteFilter}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tipo Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Tipos</SelectItem>
                {uniqueTipos.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={valorParcFilter} onValueChange={setValorParcFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Valor Parc." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Valores</SelectItem>
                {uniqueValores.map((v) => (
                  <SelectItem key={v} value={v.toString()}>
                    R$ {formatCurrency(v)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={formaCobrancaFilter}
              onValueChange={setFormaCobrancaFilter}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Forma Cobrança" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas Formas</SelectItem>
                <SelectItem value="VAZIO">VAZIO</SelectItem>
                {uniqueFormasCobranca.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="w-[160px]">
              <Input
                type="date"
                value={dataCombinadaFilter}
                onChange={(e) => setDataCombinadaFilter(e.target.value)}
                title="Filtro Data Combinada"
              />
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={resetFilters}
              title="Limpar Filtros"
            >
              <Eraser className="h-4 w-4" />
            </Button>
          </div>

          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dívida ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo Cliente</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Forma (Pagamento)</TableHead>
                  <TableHead>Forma Cobrança</TableHead>
                  <TableHead>Data Comb.</TableHead>
                  <TableHead className="text-right">Valor Parc.</TableHead>
                  <TableHead className="text-right">Pago</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={11}
                      className="text-center text-muted-foreground h-24"
                    >
                      Nenhuma dívida encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((d) => {
                    const status = getStatus(d)
                    const isBoletoConferir = d.forma_pagamento
                      ?.toLowerCase()
                      .includes('a conferir')
                    const isBoletoConferido = d.forma_pagamento
                      ?.toLowerCase()
                      .includes('conferido')

                    return (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono text-xs">
                          #{d.id}
                        </TableCell>
                        <TableCell
                          className="font-medium max-w-[200px] truncate"
                          title={d.CLIENTES?.['NOME CLIENTE']}
                        >
                          {d.cliente_id} - {d.CLIENTES?.['NOME CLIENTE']}
                        </TableCell>
                        <TableCell>
                          {d.CLIENTES?.['TIPO DE CLIENTE'] || '-'}
                        </TableCell>
                        <TableCell>
                          {d.vencimento
                            ? format(parseISO(d.vencimento), 'dd/MM/yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {isBoletoConferir ? (
                            <span className="text-red-600 font-bold">
                              {d.forma_pagamento}
                            </span>
                          ) : isBoletoConferido ? (
                            <span className="text-green-600 font-bold">
                              {d.forma_pagamento}
                            </span>
                          ) : (
                            <span>{d.forma_pagamento}</span>
                          )}
                        </TableCell>
                        <TableCell>{d.forma_cobranca || '-'}</TableCell>
                        <TableCell>
                          {d.data_combinada
                            ? format(parseISO(d.data_combinada), 'dd/MM/yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {formatCurrency(d.valor_parcela)}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-mono text-xs">
                          {formatCurrency(d.valor_pago)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              status === 'VENCIDO'
                                ? 'destructive'
                                : status === 'PAGO'
                                  ? 'default'
                                  : 'secondary'
                            }
                            className={
                              status === 'A VENCER'
                                ? 'bg-green-100 text-green-800 hover:bg-green-200 border-transparent font-bold'
                                : ''
                            }
                          >
                            {status === 'A VENCER'
                              ? 'a vencer'
                              : status.toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                              onClick={() => openEdit(d)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-600 hover:bg-red-50"
                              onClick={() => handleDelete(d.id)}
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <DividaManualFormDialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        debt={selectedDebt}
      />
    </div>
  )
}
