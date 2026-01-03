import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, AlertTriangle } from 'lucide-react'

interface DuplicateClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingClient: any
}

export function DuplicateClientDialog({
  open,
  onOpenChange,
  existingClient,
}: DuplicateClientDialogProps) {
  if (!existingClient) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            CPF/CNPJ Duplicado!
          </AlertDialogTitle>
          <AlertDialogDescription>
            Este documento já está cadastrado no sistema.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Card className="bg-muted/30 border-amber-200">
          <CardContent className="p-4 space-y-2">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">
                Cliente Existente
              </p>
              <p className="text-lg font-bold">
                {existingClient['NOME CLIENTE']}
              </p>
              <p className="text-sm">Código: {existingClient.CODIGO}</p>
            </div>
          </CardContent>
        </Card>

        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>
            Entendido
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
