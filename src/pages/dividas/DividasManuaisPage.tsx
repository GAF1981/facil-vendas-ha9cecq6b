import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DividasManuaisTable } from '@/components/dividas/DividasManuaisTable'
import { useDividasManuaisStore } from '@/stores/useDividasManuaisStore'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'

export default function DividasManuaisPage() {
  const [searchParams] = useSearchParams()
  const clienteIdParam = searchParams.get('cliente')

  const { dividas, fetchDividas, loading } = useDividasManuaisStore()
  const [search, setSearch] = useState(clienteIdParam || '')

  useEffect(() => {
    fetchDividas()
  }, [fetchDividas])

  const filtered = dividas.filter(
    (d) =>
      String(d.cliente_id).includes(search) ||
      d.CLIENTES?.['NOME CLIENTE']
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||
      String(d.cobranca_seq).includes(search),
  )

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            Dívidas (Inclusão Manual)
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie dívidas manuais e acompanhe boletos conferidos.
          </p>
        </div>
      </div>
      <div className="flex gap-4">
        <Input
          placeholder="Buscar por cliente, código ou sequência (C1)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button
          onClick={() => fetchDividas()}
          variant="outline"
          disabled={loading}
        >
          <RotateCcw
            className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
          />
          Atualizar
        </Button>
      </div>
      <DividasManuaisTable data={filtered} loading={loading} />
    </div>
  )
}
