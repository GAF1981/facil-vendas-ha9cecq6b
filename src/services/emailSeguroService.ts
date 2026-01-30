import { supabase } from '@/lib/supabase/client'

export const emailSeguroService = {
  async sendReport() {
    const { data, error } = await supabase.functions.invoke(
      'send-route-report',
      {
        method: 'POST',
      },
    )
    if (error) throw error
    return data
  },
}
