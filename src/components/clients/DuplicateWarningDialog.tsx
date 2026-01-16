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
import { AlertTriangle } from 'lucide-react'

interface DuplicateWarningDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  duplicateData: {
    name: string
    debt?: number
  } | null
}

export function DuplicateWarningDialog({
  open,
  onOpenChange,
  onConfirm,
  duplicateData,
}: DuplicateWarningDialogProps) {
  if (!duplicateData) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            CNPJ/CPF Duplicado
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-foreground">
            <p>
              Já existe um cliente com aquele CNPJ:{' '}
              <strong>{duplicateData.name}</strong>.
            </p>
            <p className="pt-2 font-medium">
              Realmente deseja fazer o cadastro?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            NÃO
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>SIM</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
