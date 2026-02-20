import React, { useState, useEffect, useMemo } from 'react'
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
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { employeesService } from '@/services/employeesService'
import { metasService } from '@/services/metasService'
import { Employee } from '@/types/employee'
import {
  Target,
  TrendingUp,
  CheckCircle,
  Search,
  Plus,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Label } from '@/components/ui/label'

const MetasReportPage = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  })
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')

  const [isLoading, setIsLoading] = useState(false)
  const [dailyAcertos, setDailyAcertos] = useState<Map<string, number>>(
    new Map(),
  )
  const [currentMeta, setCurrentMeta] = useState<number>(0)

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dialogEmployeeId, setDialogEmployeeId] = useState<string>('')
  const [dialogMetaValue, setDialogMetaValue] = useState<string>('')
  const [isSavingMeta, setIsSavingMeta] = useState(false)

  const { toast } = useToast()

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
  }, [])

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

      const metaInfo = await metasService.getMeta(funcId)
      setCurrentMeta(metaInfo?.meta_diaria || 0)

      const acertos = await metasService.getAcertos(funcId, startStr, endStr)
      setDailyAcertos(acertos)
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

  const handleSaveMeta = async () => {
    if (!dialogEmployeeId || !dialogMetaValue) {
      toast({
        title: 'Atenção',
        description: 'Preencha todos os campos.',
        variant: 'destructive',
      })
      return
    }
    setIsSavingMeta(true)
    try {
      const funcId = parseInt(dialogEmployeeId, 10)
      const meta = parseInt(dialogMetaValue, 10)
      await metasService.upsertMeta(funcId, meta)
      toast({
        title: 'Sucesso',
        description: 'Meta atualizada com sucesso!',
        className: 'bg-green-600 text-white',
      })
      setIsDialogOpen(false)
      setDialogEmployeeId('')
      setDialogMetaValue('')

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

  const isHoliday = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const mmdd = `${month}-${day}`
    const holidays = [
      '01-01',
      '04-21',
      '05-01',
      '09-07',
      '10-12',
      '11-02',
      '11-15',
      '12-25',
    ]
    return holidays.includes(mmdd)
  }

  const reportData = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return []

    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to })
    return days.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const isBusinessDay = !isWeekend(day) && !isHoliday(day)
      const metaForDay = isBusinessDay ? currentMeta : 0
      const acertos = dailyAcertos.get(dateStr) || 0
      const apuracao = acertos - metaForDay

      return {
        date: day,
        dateStr,
        acertos,
        metaForDay,
        apuracao,
        isBusinessDay,
      }
    })
  }, [dateRange, dailyAcertos, currentMeta])

  const summary = useMemo(() => {
    let totalAcertos = 0
    let totalMetas = 0
    let totalApuracao = 0

    reportData.forEach((row) => {
      totalAcertos += row.acertos
      totalMetas += row.metaForDay
      totalApuracao += row.apuracao
    })

    return { totalAcertos, totalMetas, totalApuracao }
  }, [reportData])

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Metas de Acertos
          </h1>
          <p className="text-muted-foreground">
            Acompanhamento diário de metas por funcionário.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Meta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configurar Meta Diária</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
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
                <Label>Meta Diária (Quantidade de Acertos)</Label>
                <Input
                  type="number"
                  min="0"
                  value={dialogMetaValue}
                  onChange={(e) => setDialogMetaValue(e.target.value)}
                  placeholder="Ex: 15"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveMeta} disabled={isSavingMeta}>
                {isSavingMeta ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Salvar Meta
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <Target className="w-4 h-4 mr-2 text-indigo-500" />
                  Quantidade de Metas de Acertos
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
                  Quantidade de Acertos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.totalAcertos}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2 text-blue-500" />
                  Quantidade de Apuração de Metas
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
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detalhamento Diário</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Acertos</TableHead>
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
                      className={!row.isBusinessDay ? 'bg-muted/50' : ''}
                    >
                      <TableCell>
                        {format(row.date, 'dd/MM/yyyy', { locale: ptBR })}
                        {!row.isBusinessDay && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (Fim de semana/Feriado)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {row.acertos}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.metaForDay}
                      </TableCell>
                      <TableCell
                        className={`text-right font-bold ${row.apuracao < 0 ? 'text-red-600' : row.apuracao > 0 ? 'text-green-600' : ''}`}
                      >
                        {row.apuracao > 0 ? '+' : ''}
                        {row.apuracao}
                      </TableCell>
                    </TableRow>
                  ))}
                  {reportData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
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
