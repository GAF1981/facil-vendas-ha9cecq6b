import { supabase } from '@/lib/supabase/client'
import { Employee } from '@/types/employee'

export const authService = {
  /**
   * Verifies employee credentials against the FUNCIONARIOS table using a secure RPC call.
   * Now only checks for email existence and increments login_count.
   */
  async loginByEmail(email: string) {
    // Calling the RPC function that checks email in the FUNCIONARIOS table
    // This bypasses standard Supabase Auth for a custom "App Level" authentication
    const { data, error } = await supabase.rpc('login_by_email', {
      p_email: email.trim(),
    })

    if (error) {
      console.error('Auth RPC Error:', error)
      throw new Error(
        error.message ||
          'Erro ao validar credenciais. Tente novamente mais tarde.',
      )
    }

    // Check if any user was returned
    if (data && data.length > 0) {
      const employeeData = data[0] as unknown as Employee

      // Increment login count
      try {
        const { data: updatedData, error: updateError } = await supabase
          .from('FUNCIONARIOS')
          .update({ login_count: ((employeeData as any).login_count || 0) + 1 })
          .eq('id', employeeData.id)
          .select('login_count')
          .single()

        if (!updateError && updatedData) {
          employeeData.login_count = updatedData.login_count
        }
      } catch (err) {
        console.error('Failed to increment login count', err)
      }

      return employeeData
    }

    return null
  },
}
