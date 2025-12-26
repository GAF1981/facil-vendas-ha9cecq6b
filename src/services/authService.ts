import { supabase } from '@/lib/supabase/client'
import { Employee } from '@/types/employee'

export const authService = {
  /**
   * Verifies employee credentials against the FUNCIONARIOS table using a secure RPC call.
   */
  async verifyCredentials(email: string, password: string) {
    const { data, error } = await supabase.rpc('verify_employee_credentials', {
      p_email: email,
      p_senha: password,
    })

    if (error) throw error

    // data is an array because the function returns a table
    // Cast the result to match the updated Employee interface (specifically for foto_url)
    return data && data.length > 0 ? (data[0] as unknown as Employee) : null
  },
}
