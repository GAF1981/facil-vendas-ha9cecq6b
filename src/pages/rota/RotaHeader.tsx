import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Rota } from '@/types/rota'
import { Employee } from '@/types/employee'
import { rotaService } from '@/services/rotaService'
import { useToast } from '@/components/ui/use-toast'
import { Upload, Play, CheckSquare, RefreshCcw } from 'lucide-react'

interface RotaHeaderProps {
  activeRota: Rota | null
  onReload: () => void
  employees: Employee[]
}

export function RotaHeader({
  activeRota,
  onReload,
  employees,
}: RotaHeaderProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleStart = async () => {
    try {
      await rotaService.startRota()
      toast({ title: 'Rota iniciada com sucesso' })
      onReload()
    } catch (e) {
      toast({ title: 'Erro ao iniciar rota', variant: 'destructive' })
    }
  }

  const handleFinish = async () => {
    if (!activeRota) return
    try {
      await rotaService.finishAndStartNewRoute(activeRota.id)
      toast({ title: 'Rota finalizada e nova rota criada' })
      onReload()
    } catch (e) {
      toast({ title: 'Erro ao finalizar rota', variant: 'destructive' })
    }
  }

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeRota) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string
        const lines = text.split('\n')
        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())

        const codIdx = headers.findIndex(
          (h) =>
            h.includes('codigo') || h.includes('código') || h === 'cliente',
        )
        const vendIdx = headers.findIndex(
          (h) =>
            h.includes('vendedor') &&
            !h.includes('próximo') &&
            !h.includes('proximo'),
        )
        const proxIdx = headers.findIndex(
          (h) => h.includes('próximo') || h.includes('proximo'),
        )

        if (codIdx === -1) {
          toast({
            title: 'Coluna de código de cliente não encontrada no CSV',
            variant: 'destructive',
          })
          return
        }

        const assignments = []
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue
          const values = lines[i].split(',')
          const clientId = parseInt(values[codIdx])
          if (isNaN(clientId)) continue

          const resolveEmp = (idx: number) => {
            if (idx === -1) return undefined
            const name = values[idx]?.trim()
            if (!name) return null
            const emp = employees.find(
              (e) =>
                e.nome_completo.toLowerCase() === name.toLowerCase() ||
                e.apelido?.toLowerCase() === name.toLowerCase(),
            )
            return emp ? emp.id : null
          }

          assignments.push({
            clientId,
            sellerId: resolveEmp(vendIdx),
            nextSellerId: resolveEmp(proxIdx),
          })
        }

        await rotaService.importSellerAssignments(activeRota.id, assignments)
        toast({
          title: 'Importação concluída',
          description: `${assignments.length} clientes atualizados.`,
        })
        onReload()
      } catch (error) {
        toast({ title: 'Erro na importação', variant: 'destructive' })
      }
    }
    reader.readAsText(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          Gestão de Rota
          <Button
            variant="ghost"
            size="icon"
            onClick={onReload}
            className="h-8 w-8 text-muted-foreground"
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </h1>
        <p className="text-muted-foreground mt-1">
          {activeRota
            ? `Rota Ativa: #${activeRota.id} (Início: ${new Date(activeRota.data_inicio).toLocaleDateString('pt-BR')})`
            : 'Nenhuma rota ativa no momento'}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {activeRota ? (
          <>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImportCsv}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="shadow-sm bg-background"
            >
              <Upload className="w-4 h-4 mr-2" /> Importar CSV
            </Button>
            <Button
              onClick={handleFinish}
              variant="default"
              className="shadow-sm"
            >
              <CheckSquare className="w-4 h-4 mr-2" /> Finalizar Rota
            </Button>
          </>
        ) : (
          <Button onClick={handleStart} variant="default" className="shadow-sm">
            <Play className="w-4 h-4 mr-2" /> Iniciar Rota
          </Button>
        )}
      </div>
    </div>
  )
}
