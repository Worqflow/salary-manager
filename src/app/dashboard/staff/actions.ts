"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export interface StaffFormData {
  surname: string;
  first_name: string;
  middle_name: string;
  position: string;
  department_id: string;
  email: string;
  phone: string;
  tax_id: string;
  pension_pin: string;
  nhf_number: string;
  staff_number: string;
  bank_id: string;
  account_number: string;
  account_name: string;
}

export async function addStaff(data: StaffFormData) {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: userRow } = await supabase
    .from("users")
    .select("school_id")
    .eq("id", user.id)
    .single();

  if (!userRow) throw new Error("User record not found");

  const { error } = await supabase.from("staff").insert({
    ...data,
    school_id: userRow.school_id,
    is_active: true,
    needs_review: false,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/staff");
}

export async function updateStaff(id: string, data: StaffFormData) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("staff")
    .update({ ...data, needs_review: false })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/staff");
}

export async function deactivateStaff(id: string) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("staff")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/staff");
}

export async function reactivateStaff(id: string) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("staff")
    .update({ is_active: true })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/staff");
}