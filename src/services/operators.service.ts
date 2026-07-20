import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

export const operatorsService = {
  /**
   * Get all operators that belong to the current superadmin
   */
  async getOperators(superadminId: string): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('parent_id', superadminId)
      .eq('role', 'operator')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  /**
   * Call the create_operator RPC function
   */
  async createOperator(username: string, password: string, fullName: string) {
    const { data, error } = await supabase.rpc('create_operator', {
      p_username: username,
      p_password: password,
      p_full_name: fullName,
    })

    if (error) throw error
    return data
  },

  /**
   * Call the delete_operator RPC function
   */
  async deleteOperator(operatorId: string) {
    const { error } = await supabase.rpc('delete_operator', {
      p_operator_id: operatorId,
    })

    if (error) throw error
  },
}
