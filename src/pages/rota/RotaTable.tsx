import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { RotaRow } from '@/types/rota'
import { Employee } from '@/types/employee'
import { rotaService } from '@/services/rotaService'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

interface RotaTableProps {
  data: RotaRow[]
  employees: Employee[]
  activeRotaId?: number
  onUpdate: () => void
  loading: boolean
  isGerencial: boolean
}

export function RotaTable({
  data,
  employees,
  activeRotaId,
  onUpdate,
  loading,
  isGerencial,
}: RotaTableProps) {
  const { toast } = useToast()

  const handleVendedorChange = async (clientId: number, sellerId: string) => {
    if (!activeRotaId) return
    try {
      await rotaService.upsertRotaItem({
        rota_id: activeRotaId,
        cliente_id: clientId,
        vendedor_id: sellerId === 'none' ? null : parseInt(sellerId),
      })
      onUpdate()
    } catch (error) {
      toast({ title: 'Erro ao atualizar vendedor', variant: 'destructive' })
    }
  }

  const handleProximoChange = async (
    clientId: number,
    tarefas: string | null,
    nextSellerId: string,
  ) => {
    if (!activeRotaId) return
    try {
      await rotaService.updateNextSeller(
        activeRotaId,
        clientId,
        nextSellerId === 'none' ? null : parseInt(nextSellerId),
        tarefas,
      )
      onUpdate()
    } catch (error) {
      toast({
        title: 'Erro ao atualizar próximo vendedor',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="text-center p-12 text-muted-foreground border rounded-lg bg-card shadow-sm animate-pulse">
        Carregando dados da rota...
      </div>
    )
  }

  return (
    <div className="border rounded-lg bg-card shadow-sm overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="w-[80px] font-semibold text-foreground">
              Cód.
            </TableHead>
            <TableHead className="min-w-[250px] font-semibold text-foreground">
              Cliente
            </TableHead>
            <TableHead className="w-[80px] font-semibold text-foreground text-center">
              Rota
            </TableHead>
            <TableHead className="w-[200px] font-semibold text-foreground">
              Vendedores
            </TableHead>
            <TableHead className="w-[200px] font-semibold text-primary">
              Próximo
            </TableHead>
            {isGerencial && (
              <TableHead className="text-right w-[140px] font-semibold text-foreground">
                Débito (R$)
              </TableHead>
            )}
            {isGerencial && (
              <TableHead className="w-[140px] font-semibold text-foreground">
                Vencimento
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={row.client.CODIGO}
              className={cn('hover:bg-muted/40 transition-colors', {
                'opacity-50': row.is_completed,
              })}
            >
              <TableCell className="font-medium text-muted-foreground">
                {row.client.CODIGO}
              </TableCell>
              <TableCell className="font-semibold text-foreground">
                {row.client['NOME CLIENTE']}
              </TableCell>
              <TableCell className="text-muted-foreground text-center">
                {row.x_na_rota || 0}
              </TableCell>
              <TableCell>
                <Select
                  value={row.vendedor_id?.toString() || 'none'}
                  onValueChange={(v) =>
                    handleVendedorChange(row.client.CODIGO, v)
                  }
                >
                  <SelectTrigger className="h-9 w-full bg-background shadow-sm">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="none"
                      className="text-muted-foreground italic"
                    >
                      Nenhum
                    </SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.apelido || emp.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Select
                  value={row.proximo_vendedor_id?.toString() || 'none'}
                  onValueChange={(v) =>
                    handleProximoChange(row.client.CODIGO, row.tarefas, v)
                  }
                >
                  <SelectTrigger className="h-9 w-full border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors shadow-sm text-primary font-medium">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="none"
                      className="text-muted-foreground italic"
                    >
                      Nenhum
                    </SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.apelido || emp.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              {isGerencial && (
                <TableCell className="text-right font-mono tracking-tight">
                  {row.debito > 0
                    ? row.debito.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : '-'}
                </TableCell>
              )}
              {isGerencial && (
                <TableCell>
                  <Badge
                    variant={
                      row.vencimento_status === 'VENCIDO'
                        ? 'destructive'
                        : row.vencimento_status === 'A VENCER'
                          ? 'outline'
                          : 'secondary'
                    }
                    className="whitespace-nowrap px-2 py-0.5"
                  >
                    {row.vencimento_status}
                  </Badge>
                </TableCell>
              )}
            </TableRow>
          ))}
          {data.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={isGerencial ? 7 : 5}
                className="text-center py-16 text-muted-foreground text-lg"
              >
                Nenhum registro encontrado com os filtros atuais.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
