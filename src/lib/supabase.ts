import { createBrowserClient } from '@supabase/ssr'

export type Database = {
  public: {
    Tables: {
      staff: {
        Row: {
          id: string
          school_id: string
          department_id: string | null
          full_name: string
          position: string | null
          account_number: string | null
          bank_id: string | null
          is_active: boolean
          created_at: string
        }
      }
      salary_lines: {
        Row: {
          id: string
          salary_month_id: string
          staff_id: string
          basic: number
          bonus: number
          gross: number
          paye: number
          deduction: number
          net_pay: number
          created_at: string
        }
      }
      salary_months: {
        Row: {
          id: string
          school_id: string
          month: number
          year: number
          status: string
          locked_at: string | null
        }
      }
      schools: {
        Row: {
          id: string
          name: string
          owner_email: string
          plan: string
          created_at: string
        }
      }
      departments: {
        Row: {
          id: string
          school_id: string
          name: string
        }
      }
      banks: {
        Row: {
          id: string
          name: string
          sort_code: string | null
        }
      }
    }
  }
}

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}