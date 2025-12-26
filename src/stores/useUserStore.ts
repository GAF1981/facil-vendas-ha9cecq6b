import { create } from 'zustand'
import { Employee } from '@/types/employee'

interface UserState {
  employee: Employee | null
  setEmployee: (employee: Employee | null) => void
  clearEmployee: () => void
}

export const useUserStore = create<UserState>((set) => ({
  employee: null,
  setEmployee: (employee) => set({ employee }),
  clearEmployee: () => set({ employee: null }),
}))
