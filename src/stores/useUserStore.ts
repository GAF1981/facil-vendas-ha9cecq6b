import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { Employee } from '@/types/employee'

interface UserState {
  employee: Employee | null
  setEmployee: (employee: Employee | null) => void
  clearEmployee: () => void
  showLoginNotification: boolean
  setShowLoginNotification: (show: boolean) => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      employee: null,
      setEmployee: (employee) => set({ employee }),
      clearEmployee: () =>
        set({ employee: null, showLoginNotification: false }),
      showLoginNotification: false,
      setShowLoginNotification: (show) => set({ showLoginNotification: show }),
    }),
    {
      name: 'facil-vendas-user-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
