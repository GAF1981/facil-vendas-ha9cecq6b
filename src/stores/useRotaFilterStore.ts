import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface RotaFilterStore {
  selectedEmployeeIds: string[]
  hasSetDefaultSeller: boolean
  isGerencialActive: boolean
  uniqueDebits: number[]
  setSelectedEmployeeIds: (ids: string[]) => void
  setHasSetDefaultSeller: (val: boolean) => void
  setIsGerencialActive: (val: boolean) => void
  setUniqueDebits: (debits: number[]) => void
}

export const useRotaFilterStore = create<RotaFilterStore>()(
  persist(
    (set) => ({
      selectedEmployeeIds: [],
      hasSetDefaultSeller: false,
      isGerencialActive: false,
      uniqueDebits: [],
      setSelectedEmployeeIds: (ids) => set({ selectedEmployeeIds: ids }),
      setHasSetDefaultSeller: (val) => set({ hasSetDefaultSeller: val }),
      setIsGerencialActive: (val) => set({ isGerencialActive: val }),
      setUniqueDebits: (debits) => set({ uniqueDebits: debits }),
    }),
    {
      name: 'rota-filters-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
