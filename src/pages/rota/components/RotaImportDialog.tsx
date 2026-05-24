import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { rotaService } from '@/services/rotaService'

interface RotaImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rotaId: number
  onSuccess: () => void
}

export function RotaImportDialog({
  open,
  onOpenChange,
  rotaId,
  onSuccess,
}: RotaImportDialogProps) {
  const [csvData, setCsvData] = useState('')
  const [loading, setLoading] = useState(false)

  const handleImport = async () => {
    if (!csvData.trim()) return

    setLoading(true)
    try {
      const rows = csvData
        .split('\n')
        .map((r) => r.trim())
        .filter(Boolean)
      const assignments: { clientId: number; sellerId: number }[] = []

      for (const row of rows) {
        // Expected format: CODIGO_CLIENTE,CODIGO_VENDEDOR
        const [clientIdStr, sellerIdStr] = row.split(/[,;]/)
        const clientId = parseInt(clientIdStr)
        const sellerId = parseInt(sellerIdStr)

        if (!isNaN(clientId) && !isNaN(sellerId)) {
          assignments.push({ clientId, sellerId })
        }
      }

      if (assignments.length === 0) {
        toast.error(
          'Nenhum dado válido encontrado. Formato esperado: ClienteID,VendedorID',
        )
        setLoading(false)
        return
      }

      await rotaService.importSellerAssignments(rotaId, assignments)
      toast.success(
        `Foram importados ${assignments.length} registros com sucesso!`,
      )
      onSuccess()
      onOpenChange(false)
      setCsvData('')
    } catch (e) {
      toast.error('Erro ao importar dados')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar Vendedores via CSV</DialogTitle>
          <DialogDescription>
            Cole o conteúdo CSV no formato:{' '}
            <strong>Código Cliente,Código Vendedor</strong>
            <br />1 registro por linha.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Textarea
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            placeholder="Exemplo:&#10;1001,5&#10;1002,3"
            rows={10}
            className="font-mono text-sm"
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={loading || !csvData.trim()}>
            {loading ? 'Importando...' : 'Importar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
