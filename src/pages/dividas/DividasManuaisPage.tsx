import { useState, useEffect, useMemo, useRef } from 'react'
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
import {
  Plus,
  Search,
  HandCoins,
  DollarSign,
  Upload,
  Download,
} from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'
import { DividasManuaisTable } from '@/components/dividas/DividasManuaisTable'
import { DividaManualFormDialog } from '@/components/dividas/DividaManualFormDialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Bike, List } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function DividasManuaisPage() {
  const [searchParams] = useSearchParams()
  const { dividas, fetchDividas, loading, addDivida } = useDividasManuaisStore()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

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
  const [activeTab, setActiveTab] = useState('geral')

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
        const matchId = d.cliente_id?.toString().includes(term)
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

  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      toast({
        title: 'Nenhum dado',
        description: 'Não há dados para exportar.',
        variant: 'destructive',
      })
      return
    }
    const headers = [
      'Cobrança',
      'Funcionário',
      'Código Cliente',
      'Cliente',
      'Data Acerto',
      'Vencimento',
      'Forma Pagamento',
      'Valor Parcela',
      'Pago',
      'Dívida',
      'Forma Cobrança',
      'Data Combinada',
      'Motivo',
    ]
    const csvRows = filteredData.map((row) => {
      const debito = Math.max(0, row.valor_parcela - row.valor_pago)
      return [
        `C${row.cobranca_seq}`,
        row.FUNCIONARIOS?.nome_completo || '',
        row.cliente_id || '',
        row.CLIENTES?.['NOME CLIENTE'] || '',
        row.data_acerto || '',
        row.vencimento || '',
        row.forma_pagamento || '',
        row.valor_parcela || 0,
        row.valor_pago || 0,
        debito,
        row.forma_cobranca || '',
        row.data_combinada || '',
        row.motivo || '',
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    })

    const csvContent = [headers.join(','), ...csvRows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `dividas_manuais_${new Date().toISOString().split('T')[0]}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter((r) => r.trim().length > 0)

      if (lines.length <= 1) {
        toast({
          title: 'Aviso',
          description: 'Arquivo vazio ou sem dados válidos.',
        })
        return
      }

      const firstLine = lines[0] || ''
      const delimiterOptions = [',', ';', '\t']
      let delimiter = ','
      let maxCols = 0

      for (const d of delimiterOptions) {
        const cols = firstLine.split(d).length
        if (cols > maxCols) {
          maxCols = cols
          delimiter = d
        }
      }

      const parseCSVLine = (line: string) => {
        const result = []
        let current = ''
        let inQuotes = false
        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === delimiter && !inQuotes) {
            result.push(current)
            current = ''
          } else {
            current += char
          }
        }
        result.push(current)
        return result.map((s) =>
          s.trim().replace(/^"|"$/g, '').replace(/""/g, '"'),
        )
      }

      const headers = parseCSVLine(lines[0])
      const headerIndex = headers.map((h) => h.toLowerCase().trim())

      const getIdx = (names: string[]) => {
        for (const name of names) {
          const idx = headerIndex.findIndex((h) => h === name.toLowerCase())
          if (idx !== -1) return idx
        }
        return -1
      }

      const idxCliente = getIdx([
        'código cliente',
        'codigo cliente',
        'cliente_id',
        'código',
        'codigo',
        'cod cliente',
        'cód cliente',
        'id',
      ])
      const idxDataAcerto = getIdx([
        'data acerto',
        'data_acerto',
        'data',
        'data do acerto',
        'criado em',
      ])
      const idxVenc = getIdx([
        'vencimento',
        'data vencimento',
        'data de vencimento',
        'venc',
      ])
      const idxFormaPgto = getIdx(['forma pagamento', 'forma_pagamento'])
      const idxValor = getIdx([
        'valor parcela',
        'valor_parcela',
        'valor',
        'valor da divida',
        'valor da dívida',
        'dívida',
        'divida',
        'debito',
        'débito',
        'valor devido',
      ])
      const idxPago = getIdx(['pago', 'valor_pago', 'valor pago'])
      const idxFormaCob = getIdx([
        'forma cobrança',
        'forma cobranca',
        'forma_cobranca',
      ])
      const idxDataComb = getIdx(['data combinada', 'data_combinada'])
      const idxMotivo = getIdx(['motivo', 'observacao', 'observação'])

      if (idxCliente === -1 || idxValor === -1) {
        toast({
          title: 'Erro de Layout',
          description:
            'Não foi possível encontrar as colunas obrigatórias (Código Cliente, Valor Parcela/Dívida).',
          variant: 'destructive',
        })
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      toast({
        title: 'Processando',
        description: 'Analisando arquivo...',
      })

      const parseDate = (val: string) => {
        if (!val) return null
        if (val.includes('/')) {
          const parts = val.split('/')
          if (parts.length === 3) {
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
          }
        }
        if (val.match(/^\d{4}-\d{2}-\d{2}/)) return val.substring(0, 10)
        return null
      }

      const parseNum = (val: string) => {
        if (!val) return 0
        const str = val.replace(/[R$\s]/gi, '')
        const lastComma = str.lastIndexOf(',')
        const lastDot = str.lastIndexOf('.')
        if (lastComma > lastDot) {
          return parseFloat(str.replace(/\./g, '').replace(',', '.'))
        } else if (lastDot > lastComma) {
          return parseFloat(str.replace(/,/g, ''))
        } else {
          if (str.includes(',')) {
            return parseFloat(str.replace(',', '.'))
          }
          return parseFloat(str) || 0
        }
      }

      let maxSeq = dividas.reduce(
        (max, d) => Math.max(max, d.cobranca_seq || 0),
        0,
      )
      const newDividas: any[] = []

      for (let i = 1; i < lines.length; i++) {
        const row = parseCSVLine(lines[i])
        if (
          row.length < Math.max(idxCliente, idxValor) ||
          row.join('').trim() === ''
        )
          continue

        const cliente_id = parseInt(row[idxCliente])
        if (isNaN(cliente_id) || cliente_id <= 0) continue

        maxSeq++

        const dataAcerto =
          idxDataAcerto !== -1 ? parseDate(row[idxDataAcerto]) : null
        const vencimento = idxVenc !== -1 ? parseDate(row[idxVenc]) : null
        const forma_pagamento = idxFormaPgto !== -1 ? row[idxFormaPgto] : ''
        const valor_parcela = parseNum(row[idxValor])
        const valor_pago = idxPago !== -1 ? parseNum(row[idxPago]) : 0
        const forma_cobranca = idxFormaCob !== -1 ? row[idxFormaCob] : null
        const data_combinada =
          idxDataComb !== -1 ? parseDate(row[idxDataComb]) : null
        const motivo = idxMotivo !== -1 ? row[idxMotivo] : null

        newDividas.push({
          cliente_id,
          cobranca_seq: maxSeq,
          data_acerto: dataAcerto || new Date().toISOString().split('T')[0],
          vencimento: vencimento || new Date().toISOString().split('T')[0],
          forma_pagamento: forma_pagamento || 'OUTROS',
          valor_parcela,
          valor_pago,
          forma_cobranca: forma_cobranca || null,
          data_combinada: data_combinada || null,
          motivo: motivo || null,
          rota_motoqueiro: false,
        })
      }

      if (newDividas.length === 0) {
        toast({
          title: 'Aviso',
          description: 'Nenhuma dívida válida encontrada para importar.',
        })
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      await addDivida(newDividas)

      toast({
        title: 'Sucesso',
        description: `${newDividas.length} registros importados com sucesso!`,
      })
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Falha ao importar o arquivo CSV.',
        variant: 'destructive',
      })
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

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
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="file"
            accept=".csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImportCSV}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="hidden sm:flex border-primary text-primary hover:bg-primary/5"
          >
            <Upload className="mr-2 h-4 w-4" /> Importar Débito
          </Button>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="hidden sm:flex border-primary text-primary hover:bg-primary/5"
          >
            <Download className="mr-2 h-4 w-4" /> Exportar Débito
          </Button>
          <Button
            onClick={() => setIsFormOpen(true)}
            className="bg-primary text-primary-foreground"
          >
            <Plus className="mr-2 h-4 w-4" /> Nova Dívida
          </Button>
        </div>
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
          <TabsTrigger value="geral" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="rota" className="flex items-center gap-2">
            <Bike className="h-4 w-4" />
            Rota Motoqueiro
          </TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="mt-0">
          <DividasManuaisTable
            data={filteredData.filter((d) => !d.rota_motoqueiro)}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="rota" className="mt-0">
          <DividasManuaisTable
            data={filteredData.filter((d) => d.rota_motoqueiro)}
            loading={loading}
          />
        </TabsContent>
      </Tabs>

      <DividaManualFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} />
    </div>
  )
}
