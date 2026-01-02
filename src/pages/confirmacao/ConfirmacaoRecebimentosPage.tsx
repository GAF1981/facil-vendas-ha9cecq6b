import { Button } from '@/components/ui/button'
import { ArrowLeft, Construction } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ConfirmacaoRecebimentosPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in p-4">
      <div className="bg-muted p-6 rounded-full">
        <Construction className="w-12 h-12 text-muted-foreground" />
      </div>
      <div className="space-y-2 max-w-md">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Confirmação de Recebimentos
        </h1>
        <p className="text-muted-foreground text-lg">
          Este módulo está em manutenção.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link to="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Início
        </Link>
      </Button>
    </div>
  )
}
