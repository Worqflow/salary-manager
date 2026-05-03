import { createServerSupabaseClient } from "@/lib/supabase-server";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  const [staffResult, salaryMonthResult, salaryLinesResult] = await Promise.all([
    supabase.from("staff").select("id, is_active"),
    supabase
      .from("salary_months")
      .select("id, month_label, status")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("salary_lines").select("gross, net_pay"),
  ]);

  const staff = staffResult.data ?? [];
  const activeStaff = staff.filter((s) => s.is_active).length;
  const totalStaff = staff.length;

  const latestMonth = salaryMonthResult.data;

  const lines = salaryLinesResult.data ?? [];
  const totalGross = lines.reduce((sum, l) => sum + (l.gross ?? 0), 0);
  const totalNet = lines.reduce((sum, l) => sum + (l.net_pay ?? 0), 0);

  function formatNaira(amount: number) {
    return "₦" + amount.toLocaleString("en-NG", { maximumFractionDigits: 0 });
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your school payroll at a glance</p>
        </div>
        <a href="/dashboard/staff" className="btn-primary">
          Manage Staff
        </a>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total Staff</div>
          <div className="metric-value">{totalStaff}</div>
          <div className="metric-sub">{activeStaff} active</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Current Month</div>
          <div className="metric-value" style={{ fontSize: "1.5rem" }}>
            {latestMonth?.month_label ?? "—"}
          </div>
          <div className="metric-sub">
            {latestMonth ? (
              <span className={`badge badge-${latestMonth.status}`}>
                {latestMonth.status}
              </span>
            ) : (
              "No salary month"
            )}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Total Gross</div>
          <div className="metric-value" style={{ fontSize: "1.5rem" }}>
            {formatNaira(totalGross)}
          </div>
          <div className="metric-sub">Current month</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Total Net Pay</div>
          <div className="metric-value" style={{ fontSize: "1.5rem" }}>
            {formatNaira(totalNet)}
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