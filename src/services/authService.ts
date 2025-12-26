import { supabase } from '@/lib/supabase/client'
import { Employee } from '@/types/employee'

export const authService = {
  /**
   * Verifies employee credentials against the FUNCIONARIOS table using a secure RPC call.
   */
  async verifyCredentials(email: string, password: string) {
    // Calling the updated RPC function that returns more employee details
    const { data, error } = await supabase.rpc('verify_employee_credentials', {
      p_email: email,
      p_senha: password,
    })

    if (error) {
      console.error('RPC Error:', error)
      throw error
    }

    // Return the first match if available, cast to Employee type
    // The RPC returns { id, nome_completo, apelido, cpf, email, setor, foto_url }
    return data && data.length > 0 ? (data[0] as unknown as Employee) : null
  },
}
