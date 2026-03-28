export function RotaLegend() {
  const items = [
    { color: 'bg-[#166534] border-[#14532d]', label: 'Acerto Realizado' },
    { color: 'bg-[#ef4444] border-[#dc2626]', label: 'Débito Vencido' },
    { color: 'bg-[#86efac] border-[#4ade80]', label: 'Débito a Vencer' },
    { color: 'bg-[#3b82f6] border-[#2563eb]', label: 'Fora da Rota' },
    { color: 'bg-white border-black', label: 'Na Rota, Sem Acerto' },
  ]

  return (
    <div className="flex flex-wrap gap-4 text-xs mb-2 p-2 bg-muted/20 rounded-lg border">
      <span className="font-semibold text-muted-foreground">
        Legenda (Precedência):
      </span>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <div
            className={`w-4 h-4 rounded-full ${item.color} shadow-sm border-[2px]`}
          />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}
