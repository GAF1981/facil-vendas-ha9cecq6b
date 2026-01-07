import { ClipboardList, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  onRefresh: () => void
  loading: boolean
}

export function InventoryHeader({ onRefresh, loading }: Props) {
  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-violet-100 text-violet-700 rounded-lg">
          <ClipboardList className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Inventário Geral
          </h1>
          <p className="text-muted-foreground">Controle total de estoque</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onRefresh} disabled={loading}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
