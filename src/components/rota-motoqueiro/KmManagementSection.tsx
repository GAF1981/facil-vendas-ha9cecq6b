import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { rotaMotoqueiroService } from '@/services/rotaMotoqueiroService'
import { RotaMotoqueiroKm } from '@/types/rota_motoqueiro'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Gauge, Plus, Pencil, Trash2 } from 'lucide-react'
import { KmFormDialog } from './KmFormDialog'
import { formatCurrency } from '@/lib/formatters'
import { useToast } from '@/hooks/use-toast'

export function KmManagementSection() {
  const [data, setData] = useState<RotaMotoqueiroKm[]>([])
  const [selectedMonth, setSelectedMonth] = useState(
    format(new Date(), 'yyyy-MM'),
  )
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<RotaMotoqueiroKm | null>(
    null,
  )
  const { toast } = useToast()

  const loadData = async () => {
    try {
      const res = await rotaMotoqueiroService.getAll(selectedMonth)
      setData(res)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedMonth])

  const totalKm = data.reduce((acc, curr) => acc + curr.km_percorrido, 0)

  const handleEdit = (record: RotaMotoqueiroKm) => {
    setEditingRecord(record)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja excluir este registro?')) return
    try {
      await rotaMotoqueiroService.delete(id)
      toast({ title: 'Excluído', description: 'Registro removido.' })
      loadData()
    } catch (e) {
      console.error(e)
      toast({
        title: 'Erro',
        description: 'Falha ao excluir.',
        variant: 'destructive',
      })
    }
  }

  const handleNew = () => {
    setEditingRecord(null)
    setIsDialogOpen(true)
  }

  // Generate last 12 months for filter
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    return {
      value: format(d, 'yyyy-MM'),
      label: format(d, 'MMMM yyyy', { locale: ptBR }),
    }
  })

  return (
    <div className="space-y-4 border-t pt-6 mt-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Gauge className="h-6 w-6 text-primary" />
          KM Rota Motoqueiro
        </h2>
        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleNew}>
            <Plus className="mr-2 h-4 w-4" /> Registrar KM
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total KM (
              {format(new Date(selectedMonth + '-01'), 'MMMM', {
                locale: ptBR,
              })}
              )
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {formatCurrency(totalKm)} km
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data e Hora</TableHead>
                <TableHead>Funcionário</TableHead>
                <TableHead className="text-right">KM Percorrido</TableHead>
                <TableHead className="w-[100px] text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center h-24 text-muted-foreground"
                  >
                    Nenhum registro para este mês.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      {format(new Date(row.data_hora), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      {row.funcionario?.nome_completo || 'N/D'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(row.km_percorrido)} km
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(row)}
                        >
                          <Pencil className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(row.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <KmFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={loadData}
        editingRecord={editingRecord}
      />
    </div>
  )
}
