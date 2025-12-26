import { useEffect } from 'react'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { Header } from '@/components/layout/Header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Outlet } from 'react-router-dom'
import { useUserStore } from '@/stores/useUserStore'
import { useAuth } from '@/hooks/use-auth'
import { employeesService } from '@/services/employeesService'

export default function GlobalLayout() {
  const { session } = useAuth()
  const { employee, setEmployee } = useUserStore()

  // Sync user store with session if session exists but store is empty (e.g. page refresh)
  useEffect(() => {
    const fetchEmployeeProfile = async () => {
      if (session?.user?.email && !employee) {
        try {
          const profile = await employeesService.getByEmail(session.user.email)
          if (profile) {
            setEmployee(profile)
          }
        } catch (error) {
          console.error('Failed to fetch employee profile:', error)
        }
      }
    }

    fetchEmployeeProfile()
  }, [session, employee, setEmployee])

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-8 bg-muted/20">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
