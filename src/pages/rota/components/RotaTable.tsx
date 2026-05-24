import { useMemo } from 'react'
import { RotaRow } from '@/types/rota'
import { Employee } from '@/types/employee'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { rotaService } from '@/services/rotaService'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val)
}

interface RotaTableProps {
  data: RotaRow[]
  employees: Employee[]
  loading: boolean
  activeRotaId: number | null
  onReload: () => void
}

export function RotaTable({
  data,
  employees,
  loading,
  activeRotaId,
  onReload,
}: RotaTableProps) {
  // Use globalThis.Map directly to safely avoid module/minification shadowing (Map$1 error fix)
  const employeeMap = useMemo(() => {
    const map = new globalThis.Map<number, Employee>()
    employees.forEach((emp) => map.set(emp.id, emp))
    return map
  }, [employees])

  const handleSellerChange = async (clientId: number, newSellerId: string) => {
    if (!activeRotaId) return
    try {
      const sellerId = newSellerId === 'none' ? null : parseInt(newSellerId)
      await rotaService.upsertRotaItem({
        rota_id: activeRotaId,
        cliente_id: clientId,
        vendedor_id: sellerId,
      })
      toast.success('Vendedor atualizado com sucesso')
      onReload()
    } catch (e) {
      toast.error('Erro ao atualizar vendedor')
    }
  }

  const handleNextSellerChange = async (
    clientId: number,
    newSellerId: string,
  ) => {
    if (!activeRotaId) return
    try {
      const sellerId = newSellerId === 'none' ? null : parseInt(newSellerId)
      await rotaService.updateNextSeller(activeRotaId, clientId, sellerId, null)
      toast.success('Próximo vendedor atualizado')
      onReload()
    } catch (e) {
      toast.error('Erro ao atualizar próximo vendedor')
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground animate-pulse">
        Carregando rota...
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        Nenhum cliente na rota.
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-x-auto shadow-sm">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-16">Seq</TableHead>
            <TableHead className="w-[300px]">Cliente</TableHead>
            <TableHead>Município</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[180px]">Vendedor</TableHead>
            <TableHead className="w-[180px] bg-primary/5">Próximo</TableHead>
            <TableHead className="text-right">Débito</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => {
            return (
              <TableRow
                key={row.client.CODIGO}
                className={cn(row.is_completed && 'opacity-50 bg-muted/30')}
              >
                <TableCell className="font-medium text-muted-foreground">
                  {row.rowNumber}
                </TableCell>
                <TableCell>
                  <div className="font-medium text-sm text-foreground">
                    {row.client.CODIGO} - {row.client['NOME CLIENTE']}
                  </div>
                  {row.client['TIPO DE CLIENTE'] && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {row.client['TIPO DE CLIENTE']}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {row.client['MUNICÍPIO']}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      row.vencimento_status === 'VENCIDO'
                        ? 'destructive'
                        : row.vencimento_status === 'A VENCER'
                          ? 'outline'
                          : 'secondary'
                    }
                    className="font-medium shadow-none"
                  >
                    {row.vencimento_status}
                  </Badge>
                </TableCell>

                <TableCell>
                  <Select
                    value={
                      row.vendedor_id ? row.vendedor_id.toString() : 'none'
                    }
                    onValueChange={(val) =>
                      handleSellerChange(row.client.CODIGO, val)
                    }
                  >
                    <SelectTrigger className="w-full h-9 text-xs">
                      <SelectValue placeholder="Sem Vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value="none"
                        className="text-muted-foreground italic"
                      >
                        Sem Vendedor
                      </SelectItem>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>
                          {emp.apelido || emp.nome_completo.split(' ')[0]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>

                <TableCell className="bg-primary/5 border-l border-r">
                  <Select
                    value={
                      row.proximo_vendedor_id
                        ? row.proximo_vendedor_id.toString()
                        : 'none'
                    }
                    onValueChange={(val) =>
                      handleNextSellerChange(row.client.CODIGO, val)
                    }
                  >
                    <SelectTrigger className="w-full h-9 text-xs bg-background">
                      <SelectValue placeholder="Sem Próximo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value="none"
                        className="text-muted-foreground italic"
                      >
                        Sem Próximo
                      </SelectItem>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>
                          {emp.apelido || emp.nome_completo.split(' ')[0]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>

                <TableCell className="text-right text-sm">
                  {row.debito > 0 ? (
                    <span className="text-destructive font-semibold">
                      {formatCurrency(row.debito)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
