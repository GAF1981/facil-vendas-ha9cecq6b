import React, { useState, useMemo, useContext } from 'react'

interface DreState {
  cmvTotal: number
  setCmvTotal: (v: number) => void
  vendaTotal: number
  setVendaTotal: (v: number) => void
  customCosts: Record<string, string>
  setCustomCost: (id: string, val: string) => void
  setAllCustomCosts: (v: Record<string, string>) => void
  costsPeriod: string
  setCostsPeriod: (v: string) => void
}

const DreContext = React.createContext<DreState | null>(null)

export function DreProvider({ children }: { children: React.ReactNode }) {
  const [cmvTotal, setCmvTotal] = useState(0)
  const [vendaTotal, setVendaTotal] = useState(0)
  const [customCosts, setCustomCosts] = useState<Record<string, string>>({})
  const [costsPeriod, setCostsPeriod] = useState('')

  const setCustomCost = (id: string, val: string) => {
    setCustomCosts((prev) => ({ ...prev, [id]: val }))
  }

  const value = useMemo(
    () => ({
      cmvTotal,
      setCmvTotal,
      vendaTotal,
      setVendaTotal,
      customCosts,
      setCustomCost,
      setAllCustomCosts: setCustomCosts,
      costsPeriod,
      setCostsPeriod,
    }),
    [cmvTotal, vendaTotal, customCosts, costsPeriod],
  )

  return React.createElement(DreContext.Provider, { value }, children)
}

export default function useDreStore() {
  const ctx = useContext(DreContext)
  if (!ctx) throw new Error('useDreStore must be used within DreProvider')
  return ctx
}
