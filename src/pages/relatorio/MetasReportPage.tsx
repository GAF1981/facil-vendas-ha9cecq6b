import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DateRangePicker } from '@/components/common/DateRangePicker'
import { DateRange } from 'react-day-picker'
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isWeekend,
  startOfDay,
  isAfter,
  parseISO,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { employeesService } from '@/services/employeesService'
import { metasService } from '@/services/metasService'
import { Employee } from '@/types/employee'
import { MetaPeriodo } from '@/types/meta'
import {
  Target,
  TrendingUp,
  CheckCircle,
  Search,
  Loader2,
  PieChart,
  Trash2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Label } from '@/components/ui/label'
import { ManageExceptionsDialog } from '@/components/relatorio/ManageExceptionsDialog'

const MetasReportPage = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  })
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [summaryFilter, setSummaryFilter] = useState<string>('rota')

  const [isLoading, setIsLoading] = useState(false)
  const [dailyAcertos, setDailyAcertos] = useState<Map<string, number>>(
    new Map(),
  )
  const [dailyCaptacao, setDailyCaptacao] = useState<Map<string, number>>(
    new Map(),
  )
  const [currentMetaDiaria, setCurrentMetaDiaria] = useState<number>(0)
  const [periodGoals, setPeriodGoals] = useState<MetaPeriodo[]>([])
  const [exceptionDates, setExceptionDates] = useState<any[]>([])

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogEmployeeId, setDialogEmployeeId] = useState<string>('')
  const [dialogMetaValue, setDialogMetaValue] = useState<string>('')
  const [periodDateRange, setPeriodDateRange] = useState<
    DateRange | undefined
  >()
  const [periodMetaValue, setPeriodMetaValue] = useState<string>('')
  const [dialogPeriodGoals, setDialogPeriodGoals] = useState<MetaPeriodo[]>([])
  const [isSavingMeta, setIsSavingMeta] = useState(false)

  const { toast } = useToast()

  const fetchExceptions = useCallback(async () => {
    try {
      const data = await metasService.getExceptionDays()
      setExceptionDates(data)
    } catch (e) {
      console.error('Failed to load exceptions', e)
    }
  }, [])

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data } = await employeesService.getEmployees(1, 1000)
        setEmployees(data)
      } catch (error) {
        console.error('Error fetching employees:', error)
      }
    }
    fetchEmployees()
    fetchExceptions()
  }, [fetchExceptions])

  useEffect(() => {
    if (isDialogOpen && dialogEmployeeId) {
      const empId = parseInt(dialogEmployeeId, 10)
      metasService.getMeta(empId).then((res) => {
        setDialogMetaValue(res?.meta_diaria?.toString() || '')
      })
      metasService.getMetasPeriodos(empId).then((res) => {
        setDialogPeriodGoals(res)
      })
    } else if (!isDialogOpen) {
      setDialogEmployeeId('')
      setDialogMetaValue('')
      setPeriodMetaValue('')
      setPeriodDateRange(undefined)
      setDialogPeriodGoals([])
    }
  }, [isDialogOpen, dialogEmployeeId])

  const handleSearch = async () => {
    if (!selectedEmployeeId || !dateRange?.from || !dateRange?.to) {
      toast({
        title: 'Filtro Incompleto',
        description: 'Selecione um funcionário e um período válido.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const funcId = parseInt(selectedEmployeeId, 10)
      const startStr = format(dateRange.from, 'yyyy-MM-dd')
      const endStr = format(dateRange.to, 'yyyy-MM-dd')

      const emp = employees.find((e) => e.id.toString() === selectedEmployeeId)
      const empName = emp ? emp.nome_completo : ''

      const metaInfo = await metasService.getMeta(funcId)
      setCurrentMetaDiaria(metaInfo?.meta_diaria || 0)

      const periodos = await metasService.getMetasPeriodos(funcId)
      setPeriodGoals(periodos)

      const acertos = await metasService.getAcertos(
        funcId,
        empName,
        startStr,
        endStr,
      )
      setDailyAcertos(acertos.regular)
      setDailyCaptacao(acertos.captacao)
    } catch (error: any) {
      console.error(error)
      toast({
        title: 'Erro ao buscar dados',
        description: error.message || 'Erro desconhecido',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveMetaFixa = async () => {
    if (!dialogEmployeeId || !dialogMetaValue) {
      toast({
        title: 'Atenção',
        description: 'Preencha o valor da meta.',
        variant: 'destructive',
      })
      return
    }
    setIsSavingMeta(true)
    try {
      const funcId = parseInt(dialogEmployeeId, 10)
      const meta = parseFloat(dialogMetaValue)
      await metasService.upsertMeta(funcId, meta)
      toast({
        title: 'Sucesso',
        description: 'Meta fixa atualizada com sucesso!',
        className: 'bg-green-600 text-white',
      })

      if (selectedEmployeeId === dialogEmployeeId) {
        handleSearch()
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsSavingMeta(false)
    }
  }

  const handleSaveMetaPeriodo = async () => {
    if (
      !dialogEmployeeId ||
      !periodMetaValue ||
      !periodDateRange?.from ||
      !periodDateRange?.to
    ) {
      toast({
        title: 'Atenção',
        description: 'Preencha o período e o valor da meta.',
        variant: 'destructive',
      })
      return
    }
    setIsSavingMeta(true)
    try {
      const funcId = parseInt(dialogEmployeeId, 10)
      const meta = parseFloat(periodMetaValue)
      await metasService.addMetaPeriodo(
        funcId,
        format(periodDateRange.from, 'yyyy-MM-dd'),
        format(periodDateRange.to, 'yyyy-MM-dd'),
        meta,
      )
      toast({
        title: 'Sucesso',
        description: 'Meta por período adicionada!',
        className: 'bg-green-600 text-white',
      })

      setPeriodMetaValue('')
      setPeriodDateRange(undefined)

      const periodos = await metasService.getMetasPeriodos(funcId)
      setDialogPeriodGoals(periodos)

      if (selectedEmployeeId === dialogEmployeeId) {
        handleSearch()
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsSavingMeta(false)
    }
  }

  const handleDeletePeriodGoal = async (id: number) => {
    try {
      await metasService.deleteMetaPeriodo(id)
      toast({ title: 'Meta removida com sucesso' })
      const funcId = parseInt(dialogEmployeeId, 10)
      const periodos = await metasService.getMetasPeriodos(funcId)
      setDialogPeriodGoals(periodos)

      if (selectedEmployeeId === dialogEmployeeId) {
        handleSearch()
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const checkIsException = useCallback(
    (date: Date, empId: string) => {
      const dateStr = format(date, 'yyyy-MM-dd')
      for (const exc of exceptionDates) {
        if (dateStr >= exc.data_inicio && dateStr <= exc.data_fim) {
          if (!exc.funcionario_id || exc.funcionario_id.toString() === empId) {
            return true
          }
        }
      }
      return false
    },
    [exceptionDates],
  )

  const reportData = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return []

    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to })
    const today = startOfDay(new Date())

    return days.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const isException = checkIsException(day, selectedEmployeeId)
      const isWknd = isWeekend(day)
      const isNonWorkingDay = isException || isWknd
      const isFutureDate = isAfter(day, today)

      const periodGoal = periodGoals.find(
        (p) => dateStr >= p.data_inicio && dateStr <= p.data_fim,
      )
      const effectiveMeta = periodGoal
        ? parseFloat(periodGoal.valor_meta.toString())
        : parseFloat(currentMetaDiaria.toFixed(2))

      const metaForDay = isNonWorkingDay ? 0 : effectiveMeta
      const acertos = dailyAcertos.get(dateStr) || 0
      const captacao = dailyCaptacao.get(dateStr) || 0
      const totalGeral = acertos + captacao
      const apuracao = isFutureDate ? 0 : totalGeral - metaForDay

      return {
        date: day,
        dateStr,
        acertos,
        captacao,
        totalGeral,
        metaForDay,
        apuracao,
        isException,
        isWeekend: isWknd,
        isFutureDate,
      }
    })
  }, [
    dateRange,
    dailyAcertos,
    dailyCaptacao,
    currentMetaDiaria,
    periodGoals,
    checkIsException,
    selectedEmployeeId,
  ])

  const summary = useMemo(() => {
    let totalAcertos = 0
    let totalCaptacao = 0
    let totalGeral = 0
    let totalMetas = 0
    let totalApuracao = 0

    const today = startOfDay(new Date())

    reportData.forEach((row) => {
      if (!isAfter(row.date, today)) {
        totalAcertos += row.acertos
        totalCaptacao += row.captacao
        totalGeral += row.totalGeral
        totalMetas += row.metaForDay
        totalApuracao += row.apuracao
      }
    })

    const atingimento = totalMetas > 0 ? (totalGeral / totalMetas) * 100 : 0

    return {
      totalAcertos,
      totalCaptacao,
      totalGeral,
      totalMetas: parseFloat(totalMetas.toFixed(2)),
      totalApuracao: parseFloat(totalApuracao.toFixed(2)),
      atingimento: parseFloat(atingimento.toFixed(2)),
    }
  }, [reportData])

  return (
    <div className="space-y-6 animate-fade-in pb-20 p-2 sm:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Metas de Acertos
          </h1>
          <p className="text-muted-foreground">
            Acompanhamento diário de metas por funcionário.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ManageExceptionsDialog
            onExceptionsChanged={() => {
              fetchExceptions().then(() => {
                if (selectedEmployeeId) handleSearch()
              })
            }}
          />

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Target className="w-4 h-4 mr-2" />
                Configurar Metas
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Configurar Metas de Funcionários</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="fixa" className="w-full mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="fixa">Meta Fixa Diária</TabsTrigger>
                  <TabsTrigger value="periodo">Meta por Período</TabsTrigger>
                </TabsList>

                <TabsContent value="fixa" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Funcionário</Label>
                    <Select
                      value={dialogEmployeeId}
                      onValueChange={setDialogEmployeeId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um funcionário" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {emp.nome_completo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Meta Fixa Diária (Acertos)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={dialogMetaValue}
                      onChange={(e) => setDialogMetaValue(e.target.value)}
                      placeholder="Ex: 15"
                      disabled={!dialogEmployeeId}
                    />
                  </div>
                  <Button
                    onClick={handleSaveMetaFixa}
                    disabled={isSavingMeta || !dialogEmployeeId}
                  >
                    {isSavingMeta && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Salvar Meta Fixa
                  </Button>
                </TabsContent>

                <TabsContent value="periodo" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Funcionário</Label>
                    <Select
                      value={dialogEmployeeId}
                      onValueChange={setDialogEmployeeId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um funcionário" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {emp.nome_completo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Período Específico</Label>
                      <DateRangePicker
                        date={periodDateRange}
                        setDate={setPeriodDateRange}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Meta Diária no Período</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={periodMetaValue}
                        onChange={(e) => setPeriodMetaValue(e.target.value)}
                        placeholder="Ex: 20"
                        disabled={!dialogEmployeeId}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleSaveMetaPeriodo}
                    disabled={isSavingMeta || !dialogEmployeeId}
                  >
                    {isSavingMeta && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Adicionar Meta por Período
                  </Button>

                  {dialogEmployeeId && (
                    <div className="mt-6 border rounded-md p-4 max-h-[300px] overflow-auto">
                      <h4 className="font-semibold mb-4">
                        Metas por Período Cadastradas
                      </h4>
                      <div className="space-y-2">
                        {dialogPeriodGoals.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Nenhuma meta por período cadastrada.
                          </p>
                        ) : (
                          dialogPeriodGoals.map((pg) => (
                            <div
                              key={pg.id}
                              className="flex items-center justify-between bg-muted/50 p-3 rounded-lg"
                            >
                              <div>
                                <div className="font-medium text-sm">
                                  {format(
                                    parseISO(pg.data_inicio),
                                    'dd/MM/yyyy',
                                  )}{' '}
                                  até{' '}
                                  {format(parseISO(pg.data_fim), 'dd/MM/yyyy')}
                                </div>
                                <div className="text-xs text-indigo-500 font-medium mt-1">
                                  Meta: {pg.valor_meta} acertos
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeletePeriodGoal(pg.id)}
                                className="text-red-500 shrink-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Selecione o período e o funcionário para gerar o relatório.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-2 w-full md:w-auto flex-1">
              <Label>Filtro de Resumo</Label>
              <Select value={summaryFilter} onValueChange={setSummaryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rota">Por Rota</SelectItem>
                  <SelectItem value="funcionario">Por Funcionário</SelectItem>
                  <SelectItem value="geral">Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-full md:w-auto flex-1">
              <Label>Período</Label>
              <DateRangePicker
                date={dateRange}
                setDate={setDateRange}
                className="w-full"
              />
            </div>
            <div className="space-y-2 w-full md:w-auto flex-1">
              <Label>Funcionário</Label>
              <Select
                value={selectedEmployeeId}
                onValueChange={setSelectedEmployeeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleSearch}
              disabled={isLoading}
              className="w-full md:w-auto"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      {reportData.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <Target className="w-4 h-4 mr-2 text-indigo-500" />
                  Total Metas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalMetas}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  Total Geral (Acertos + Captações)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalGeral}</div>
                <div className="mt-2 text-sm text-muted-foreground border-t pt-2 flex flex-col">
                  <span className="flex justify-between">
                    <span>Regulares: {summary.totalAcertos}</span>
                    <span>Captação: {summary.totalCaptacao}</span>
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2 text-blue-500" />
                  Apuração de Metas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${summary.totalApuracao < 0 ? 'text-red-500' : 'text-green-500'}`}
                >
                  {summary.totalApuracao > 0 ? '+' : ''}
                  {summary.totalApuracao}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <PieChart className="w-4 h-4 mr-2 text-purple-500" />
                  Atingimento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.atingimento}%</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detalhamento Diário</CardTitle>
              <CardDescription>
                Exibe as metas e acertos planejados e alcançados em cada dia do
                período selecionado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Acertos (Reg.)</TableHead>
                    <TableHead className="text-right">Captações</TableHead>
                    <TableHead className="text-right">Total Geral</TableHead>
                    <TableHead className="text-right">
                      Meta de Acertos
                    </TableHead>
                    <TableHead className="text-right">
                      Apuração de Meta
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((row, idx) => (
                    <TableRow
                      key={idx}
                      className={
                        row.isException || row.isWeekend ? 'bg-muted/50' : ''
                      }
                    >
                      <TableCell>
                        {format(row.date, 'dd/MM/yyyy', { locale: ptBR })}
                        {row.isException && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (Exceção/Feriado)
                          </span>
                        )}
                        {row.isWeekend && !row.isException && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (Fim de Semana)
                          </span>
                        )}
                        {row.isFutureDate && (
                          <span className="ml-2 text-xs text-blue-500 font-medium">
                            (Futuro)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {row.acertos > 0 ? row.acertos : '-'}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {row.captacao > 0 ? row.captacao : '-'}
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-600">
                        {row.totalGeral > 0 ? row.totalGeral : '-'}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {row.metaForDay}
                      </TableCell>
                      <TableCell
                        className={`text-right font-bold ${row.apuracao < 0 ? 'text-red-600' : row.apuracao > 0 ? 'text-green-600' : ''}`}
                      >
                        {row.apuracao > 0 ? '+' : ''}
                        {parseFloat(row.apuracao.toFixed(2))}
                      </TableCell>
                    </TableRow>
                  ))}
                  {reportData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4">
                        Nenhum dado encontrado para o período.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

export default MetasReportPage
