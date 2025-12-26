import { useEffect } from 'react'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { Header } from '@/components/layout/Header'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useUserStore } from '@/stores/useUserStore'
import { employeesService } from '@/services/employeesService'

export default function GlobalLayout() {
  const { user } = useAuth()
  const { setEmployee } = useUserStore()

  useEffect(() => {
    const fetchEmployeeData = async () => {
      if (user?.email) {
        try {
          const employee = await employeesService.getByEmail(user.email)
          setEmployee(employee)
        } catch (error) {
          console.error('Error fetching employee data:', error)
          // Optionally clear employee if fetch fails, though store handles initial null
        }
      } else {
        setEmployee(null)
      }
    }

    fetchEmployeeData()
  }, [user, setEmployee])

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
