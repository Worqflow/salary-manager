import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('school_id')
    .eq('id', user.id)
    .single()

  if (!userData) redirect('/login')

  const [staffResult, salaryResult] = await Promise.all([
    supabase
      .from('staff')
      .select('id, is_active')
      .eq('school_id', userData.school_id),
    supabase
      .from('salary_lines')
      .select('net_pay, paye')
      .eq('salary_month_id', '00000000-0000-0000-0003-000000000001'),
  ])

  const activeStaff = staffResult.data?.filter(s => s.is_active).length ?? 0
  const totalNetPay = salaryResult.data?.reduce((sum, l) => sum + (l.net_pay ?? 0), 0) ?? 0
  const totalPaye = salaryResult.data?.reduce((sum, l) => sum + (l.paye ?? 0), 0) ?? 0

  const fmt = (n: number) => '₦' + n.toLocaleString('en-NG')

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">April 2026 — overview</p>
        </div>
        <Link href="/dashboard/staff" className="btn-primary"
          style={{ display: 'inline-block', padding: '9px 20px', borderRadius: '8px',
            background: 'linear-gradient(135deg,#185FA5,#1a6db5)', color: '#fff',
            textDecoration: 'none', fontSize: '13px', fontWeight: 500 }}>
          Manage staff →
        </Link>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total net pay</div>
          <div className="metric-value">{fmt(totalNetPay)}</div>
          <div className="metric-sub">April 2026</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Active staff</div>
          <div className="metric-value">{activeStaff}</div>
          <div className="metric-sub">This month</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">PAYE deducted</div>
          <div className="metric-value">{fmt(totalPaye)}</div>
          <div className="metric-sub">To remit</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Payroll status</div>
          <div className="metric-value" style={{ fontSize: '16px', paddingTop: '4px' }}>
            <span className="badge badge-locked">Locked</span>
          </div>
          <div className="metric-sub">April 2026</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Quick actions</span>
        </div>
        <div className="card-body" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link href="/dashboard/staff" className="btn-secondary"
            style={{ display: 'inline-block', padding: '9px 20px', borderRadius: '8px',
              textDecoration: 'none', fontSize: '13px', fontWeight: 500,
              color: 'var(--blue-primary)', border: '1.5px solid var(--blue-border)',
              background: 'var(--surface)' }}>
            View staff list
          </Link>
          <Link href="/dashboard/payroll" className="btn-secondary"
            style={{ display: 'inline-block', padding: '9px 20px', borderRadius: '8px',
              textDecoration: 'none', fontSize: '13px', fontWeight: 500,
              color: 'var(--blue-primary)', border: '1.5px solid var(--blue-border)',
              background: 'var(--surface)' }}>
            Open payroll
          </Link>
          <Link href="/dashboard/exports" className="btn-secondary"
            style={{ display: 'inline-block', padding: '9px 20px', borderRadius: '8px',
              textDecoration: 'none', fontSize: '13px', fontWeight: 500,
              color: 'var(--blue-primary)', border: '1.5px solid var(--blue-border)',
              background: 'var(--surface)' }}>
            Export to bank
          </Link>
        </div>
      </div>
    </div>
  )
}