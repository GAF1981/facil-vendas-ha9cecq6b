import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { rotaService } from '@/services/rotaService'
import { employeesService } from '@/services/employeesService'
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Rota } from '@/types/rota'

export function ImportAssignmentsDialog({
  activeRota,
  onSuccess,
}: {
  activeRota: Rota | null
  onSuccess: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
      setError(null)
    }
  }

  const processCSV = async () => {
    if (!file) return
    if (!activeRota) {
      setError('Nenhuma rota ativa encontrada. Crie uma rota primeiro.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter((l) => l.trim())
      if (lines.length < 2) throw new Error('Arquivo CSV vazio ou inválido.')

      const delimiter = lines[0].includes(';') ? ';' : ','
      const headers = lines[0]
        .split(delimiter)
        .map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''))

      const clientIdx = headers.findIndex(
        (h) => h.includes('cliente') || h === 'codigo' || h === 'código',
      )
      const sellerIdx = headers.findIndex((h) => h.includes('vendedor'))
      const nextSellerIdx = headers.findIndex(
        (h) => h.includes('proximo') || h.includes('próximo'),
      )

      if (clientIdx === -1) throw new Error('Coluna CLIENTE não encontrada.')

      const employees = await employeesService.getAll()
      const employeeMap = new Map()
      employees.forEach((e) => {
        employeeMap.set(e.id.toString(), e.id)
        employeeMap.set(e.nome_completo.toLowerCase(), e.id)
        if (e.apelido) employeeMap.set(e.apelido.toLowerCase(), e.id)
      })

      const assignments = []

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i]
          .split(delimiter)
          .map((c) => c.trim().replace(/^"|"$/g, ''))
        if (cols.length <= clientIdx || !cols[clientIdx]) continue

        const clientIdStr = cols[clientIdx].replace(/\D/g, '')
        if (!clientIdStr) continue
        const clientId = parseInt(clientIdStr, 10)
        if (isNaN(clientId)) continue

        let sellerId: number | undefined | null = undefined
        if (sellerIdx !== -1 && cols[sellerIdx]) {
          const sVal = cols[sellerIdx].toLowerCase()
          sellerId = employeeMap.get(sVal) || null
        }

        let nextSellerId: number | undefined | null = undefined
        if (nextSellerIdx !== -1 && cols[nextSellerIdx]) {
          const nsVal = cols[nextSellerIdx].toLowerCase()
          nextSellerId = employeeMap.get(nsVal) || null
        }

        if (sellerId !== undefined || nextSellerId !== undefined) {
          assignments.push({
            clientId,
            ...(sellerId !== undefined && { sellerId }),
            ...(nextSellerId !== undefined && { nextSellerId }),
          })
        }
      }

      if (assignments.length === 0) {
        throw new Error(
          'Nenhuma atribuição válida encontrada no CSV. Verifique os nomes.',
        )
      }

      const { count } = await rotaService.importSellerAssignments(
        activeRota.id,
        assignments,
      )

      toast({
        title: 'Importação concluída',
        description: `${count} clientes atualizados com sucesso.`,
      })

      setIsOpen(false)
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Erro ao processar o arquivo CSV.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Importar Vendedores CSV
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar Atribuições de Rota</DialogTitle>
          <DialogDescription>
            Faça o upload de um arquivo CSV contendo as colunas:
            <strong> CLIENTE</strong>, <strong>VENDEDOR</strong> e opcionalmente{' '}
            <strong>PROXIMO</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-2">
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              ref={fileInputRef}
              disabled={loading}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Formato Suportado</AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground mt-1">
              O CSV deve conter cabeçalho na primeira linha com as colunas:
              <br />- <code>CLIENTE</code>: Código Numérico do cliente
              <br />- <code>VENDEDOR</code>: Nome, apelido ou ID (opcional)
              <br />- <code>PROXIMO</code>: Nome, apelido ou ID do próximo
              vendedor (opcional)
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={processCSV} disabled={!file || loading}>
            {loading ? 'Processando...' : 'Importar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
