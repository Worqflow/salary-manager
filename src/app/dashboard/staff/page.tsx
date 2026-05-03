import { createServerSupabaseClient } from "@/lib/supabase-server";
import StaffTable from "./StaffTable";

export default async function StaffPage() {
  const supabase = await createServerSupabaseClient();

  const [staffResult, deptResult, bankResult] = await Promise.all([
    supabase
      .from("staff")
      .select(
        "id, surname, first_name, middle_name, position, department_id, " +
        "email, phone, tax_id, pension_pin, nhf_number, staff_number, " +
        "bank_id, account_number, account_name, is_active, needs_review"
      )
      .order("surname", { ascending: true }),

    supabase
      .from("departments")
      .select("id, name")
      .order("name", { ascending: true }),

    supabase
      .from("banks")
      .select("id, name")
      .order("name", { ascending: true }),
  ]);

  return (
    <StaffTable
      staff={staffResult.data ?? []}
      departments={deptResult.data ?? []}
      banks={bankResult.data ?? []}
    />
  );
}