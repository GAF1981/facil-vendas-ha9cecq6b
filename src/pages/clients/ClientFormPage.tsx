import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { ClientForm } from '@/components/clients/ClientForm'
import { clientsService } from '@/services/clientsService'
import { ClientRow } from '@/types/client'
import { useToast } from '@/hooks/use-toast'

const ClientFormPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [client, setClient] = useState<ClientRow | undefined>(undefined)

  useEffect(() => {
    const fetchClient = async () => {
      if (!id) return

      setLoading(true)
      try {
        const data = await clientsService.getById(Number(id))
        setClient(data)
      } catch (error) {
        toast({
          title: 'Erro ao carregar',
          description: 'Não foi possível carregar os dados do cliente.',
          variant: 'destructive',
        })
        navigate('/clientes')
      } finally {
        setLoading(false)
      }
    }

    fetchClient()
  }, [id, navigate, toast])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up max-w-5xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {id ? 'Editar Cliente' : 'Novo Cliente'}
          </h1>
          <p className="text-muted-foreground">
            {id
              ? `Editando cliente código ${id}`
              : 'Preencha os dados completos para cadastrar um novo cliente.'}
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <ClientForm
          initialData={client}
          onSuccess={() => navigate('/clientes')}
          onCancel={() => navigate('/clientes')}
        />
      </div>
    </div>
  )
}

export default ClientFormPage
