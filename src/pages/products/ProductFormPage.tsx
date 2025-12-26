import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { ProductForm } from '@/components/products/ProductForm'
import { productsService } from '@/services/productsService'
import { Product } from '@/types/product'
import { useToast } from '@/hooks/use-toast'

const ProductFormPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [product, setProduct] = useState<Product | undefined>(undefined)

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return

      setLoading(true)
      try {
        const data = await productsService.getById(Number(id))
        setProduct(data)
      } catch (error) {
        toast({
          title: 'Erro ao carregar',
          description: 'Não foi possível carregar os dados do produto.',
          variant: 'destructive',
        })
        navigate('/produtos')
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [id, navigate, toast])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up max-w-4xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/produtos')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {id ? 'Editar Produto' : 'Novo Produto'}
          </h1>
          <p className="text-muted-foreground">
            {id
              ? `Editando produto código ${id}`
              : 'Preencha os dados completos para cadastrar um novo produto.'}
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <ProductForm
          initialData={product}
          onSuccess={() => navigate('/produtos')}
          onCancel={() => navigate('/produtos')}
        />
      </div>
    </div>
  )
}

export default ProductFormPage
