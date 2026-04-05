import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface RotaFilterStore {
  selectedEmployeeIds: string[]
  hasSetDefaultSeller: boolean
  isGerencialActive: boolean
  isLinhaVermelhaActive: boolean
  uniqueDebits: number[]
  setSelectedEmployeeIds: (ids: string[]) => void
  setHasSetDefaultSeller: (val: boolean) => void
  setIsGerencialActive: (val: boolean) => void
  setIsLinhaVermelhaActive: (val: boolean) => void
  setUniqueDebits: (debits: number[]) => void
}

export const useRotaFilterStore = create<RotaFilterStore>()(
  persist(
    (set) => ({
      selectedEmployeeIds: [],
      hasSetDefaultSeller: false,
      isGerencialActive: false,
      isLinhaVermelhaActive: false,
      uniqueDebits: [],
      setSelectedEmployeeIds: (ids) => set({ selectedEmployeeIds: ids }),
      setHasSetDefaultSeller: (val) => set({ hasSetDefaultSeller: val }),
      setIsGerencialActive: (val) => set({ isGerencialActive: val }),
      setIsLinhaVermelhaActive: (val) => set({ isLinhaVermelhaActive: val }),
      setUniqueDebits: (debits) => set({ uniqueDebits: debits }),
    }),
    {
      name: 'rota-filters-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
