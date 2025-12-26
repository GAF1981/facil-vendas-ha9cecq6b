import { useLocation, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Construction } from 'lucide-react'

export default function PlaceholderModule() {
  const location = useLocation()
  // Extract module name from path and capitalize
  const pathPart = location.pathname.split('/')[1] || 'Módulo'
  const title =
    pathPart.charAt(0).toUpperCase() + pathPart.slice(1).replace(/-/g, ' ')

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in p-4">
      <div className="bg-muted p-6 rounded-full">
        <Construction className="w-12 h-12 text-muted-foreground" />
      </div>
      <div className="space-y-2 max-w-md">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="text-muted-foreground text-lg">
          Este módulo está em desenvolvimento. Em breve novas funcionalidades
          estarão disponíveis aqui.
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
