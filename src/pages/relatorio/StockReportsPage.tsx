import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function StockReportsPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6 animate-fade-in p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/relatorio')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Estoque</h1>
      </div>
    </div>
  )
}
