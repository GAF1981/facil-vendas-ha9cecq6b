export function RotaLegend() {
  const items = [
    { color: 'bg-red-500', label: 'Débito > R$ 10,00' },
    { color: 'bg-purple-300', label: 'x na ROTA > 3' },
    { color: 'bg-orange-400', label: 'Com Pendências' },
    { color: 'bg-yellow-300', label: 'Observação Fixa' },
    // Updated color to match the "Dark Green" description and Tailwind usage in Table (bg-green-600)
    { color: 'bg-green-600', label: 'Atendimento Realizado (Verde Escuro)' },
  ]

  return (
    <div className="flex flex-wrap gap-4 text-xs mb-4 p-3 bg-muted/20 rounded-lg border">
      <span className="font-semibold text-muted-foreground">Legenda:</span>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded-sm ${item.color} shadow-sm`} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}
