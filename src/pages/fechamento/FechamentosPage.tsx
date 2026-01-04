import { Button } from '@/components/ui/button'
import { ArrowLeft, Lock, QrCode, UserX, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PixTabContent } from '@/components/fechamento/PixTabContent'
import { InactiveClientsTabContent } from '@/components/fechamento/InactiveClientsTabContent'
import { ClosingTabContent } from '@/components/fechamento/ClosingTabContent'

export default function FechamentosPage() {
  return (
    <div className="space-y-6 animate-fade-in p-2 pb-20 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fechamentos</h1>
            <p className="text-muted-foreground">
              Central de encerramento, conferência de PIX e inativos.
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="fechamento" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px] mb-4">
          <TabsTrigger value="fechamento" className="gap-2">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">Fechamento Caixa</span>
            <span className="sm:hidden">Caixa</span>
          </TabsTrigger>
          <TabsTrigger value="pix" className="gap-2">
            <QrCode className="h-4 w-4" />
            <span className="hidden sm:inline">Conferência Pix</span>
            <span className="sm:hidden">Pix</span>
          </TabsTrigger>
          <TabsTrigger value="inativos" className="gap-2">
            <UserX className="h-4 w-4" />
            <span className="hidden sm:inline">Clientes Inativos</span>
            <span className="sm:hidden">Inativos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fechamento" className="mt-0">
          <ClosingTabContent />
        </TabsContent>

        <TabsContent value="pix" className="mt-0">
          <PixTabContent />
        </TabsContent>

        <TabsContent value="inativos" className="mt-0">
          <InactiveClientsTabContent />
        </TabsContent>
      </Tabs>
    </div>
  )
}
