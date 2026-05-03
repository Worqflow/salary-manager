import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { Database } from "@/lib/supabase";

type SalaryMonth = Database["public"]["Tables"]["salary_months"]["Row"];
type SalaryLine = Database["public"]["Tables"]["salary_lines"]["Row"];
type Staff = Database["public"]["Tables"]["staff"]["Row"];

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  const [staffResult, salaryMonthResult] = await Promise.all([
    supabase.from("staff").select("id, is_active"),
    supabase
      .from("salary_months")
      .select("id, month, year, status")
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const staff = (staffResult.data ?? []) as Pick<Staff, "id" | "is_active">[];
  const activeStaff = staff.filter((s) => s.is_active).length;
  const latestMonth = salaryMonthResult.data as Pick<SalaryMonth, "id" | "month" | "year" | "status"> | null;

  let totalGross = 0;
  let totalNet = 0;
  if (latestMonth) {
    const { data: lines } = await supabase
      .from("salary_lines")
      .select("gross, net_pay")
      .eq("salary_month_id", latestMonth.id);
    const typedLines = (lines ?? []) as Pick<SalaryLine, "gross" | "net_pay">[];
    totalGross = typedLines.reduce((sum, l) => sum + (l.gross ?? 0), 0);
    totalNet   = typedLines.reduce((sum, l) => sum + (l.net_pay ?? 0), 0);
  }

  const fmt = (n: number) =>
    "₦" + n.toLocaleString("en-NG", { maximumFractionDigits: 0 });

  const monthLabel = latestMonth
    ? `${MONTH_NAMES[latestMonth.month]} ${latestMonth.year}`
    : null;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {monthLabel ? `${monthLabel} — overview` : "Overview"}
          </p>
        </div>
        <a href="/dashboard/staff" className="btn-primary">Manage Staff</a>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Staff</div>
          <div className="metric-value">{staff.length}</div>
          <div className="metric-sub">{activeStaff} active</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Current Month</div>
          <div className="metric-value" style={{ fontSize: "1.5rem" }}>
            {monthLabel ?? "—"}
          </div>
          <div className="metric-sub">
            {latestMonth ? (
              <span className={`badge badge-${latestMonth.status}`}>
                {latestMonth.status}
              </span>
            ) : "No salary month"}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Gross</div>
          <div className="metric-value" style={{ fontSize: "1.5rem" }}>
            {fmt(totalGross)}
          </div>
          <div className="metric-sub">{monthLabel ?? "Current month"}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Net Pay</div>
          <div className="metric-value" style={{ fontSize: "1.5rem" }}>
            {fmt(totalNet)}
          </div>
          <div className="metric-sub">After PAYE &amp; deductions</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: "2rem" }}>
        <div className="card-header">
          <h2 className="card-title">Quick Actions</h2>
        </div>
        <div className="card-body" style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <a href="/dashboard/staff" className="btn-primary">Manage Staff</a>
          <a href="/dashboard/payroll" className="btn-secondary">View Payroll</a>
          <a href="/dashboard/exports" className="btn-secondary">Export Files</a>
        </div>
      </div>
    </div>
  );
}