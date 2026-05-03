import { createServerSupabaseClient } from "@/lib/supabase-server";
import NavLinks from "./NavLinks";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-brand">
            <span className="topbar-brand-accent">Salary</span>Manager
          </div>

          <NavLinks />

          <div className="topbar-user">
            <span className="topbar-email">{user?.email}</span>
            <form action="/auth/signout" method="post">
              <button type="submit" className="topbar-signout">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="dashboard-main">{children}</main>
    </>
  );
}