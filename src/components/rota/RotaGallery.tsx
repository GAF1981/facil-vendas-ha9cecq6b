import { RotaRow } from '@/types/rota'
import { Employee } from '@/types/employee'
import { RotaCard } from './RotaCard'
import { useEffect, useRef, useState } from 'react'

interface RotaGalleryProps {
  rows: RotaRow[]
  sellers: Employee[]
  onUpdateRow: (clientId: number, field: string, value: any) => void
  disabled: boolean
}

export function RotaGallery({
  rows,
  sellers,
  onUpdateRow,
  disabled,
}: RotaGalleryProps) {
  const [visibleCount, setVisibleCount] = useState(24)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Reset visible count when rows change (e.g. filters applied)
  useEffect(() => {
    setVisibleCount(24)
  }, [rows])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 24, rows.length))
        }
      },
      { threshold: 0.1, rootMargin: '100px' },
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [rows.length])

  const visibleRows = rows.slice(0, visibleCount)

  return (
    <div className="h-full overflow-y-auto p-4 bg-muted/10">
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <p className="text-lg font-medium">Nenhum cliente encontrado.</p>
          <p className="text-sm">Tente ajustar os filtros de busca.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {visibleRows.map((row) => (
            <RotaCard
              key={row.client.CODIGO}
              row={row}
              sellers={sellers}
              onUpdateRow={onUpdateRow}
              disabled={disabled}
            />
          ))}
        </div>
      )}

      {/* Invisible element to trigger load more */}
      {visibleCount < rows.length && (
        <div
          ref={loadMoreRef}
          className="h-20 w-full flex items-center justify-center text-muted-foreground text-sm"
        >
          Carregando mais clientes...
        </div>
      )}

      {/* Spacer for bottom navigation if needed, or just visual padding */}
      <div className="h-8" />
    </div>
  )
}
