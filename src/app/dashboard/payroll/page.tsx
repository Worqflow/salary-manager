'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SalaryMonth {
  id: string;
  school_id: string;
  month: number;
  year: number;
  status: 'open' | 'locked';
  locked_at: string | null;
}

interface SalaryLine {
  id: string;
  salary_month_id: string;
  staff_id: string;
  basic: number;
  bonus: number;
  gross: number;
  paye: number;
  deduction: number;
  net_pay: number;
  staff: {
    id: string;
    surname: string;
    first_name: string;
    middle_name: string | null;
    position: string;
    account_number: string | null;
    account_name: string | null;
    bank_id: string | null;
    is_active: boolean;
    banks?: { name: string } | null;
  };
}

interface EditState {
  basic: string;
  bonus: string;
  deduction: string;
}

interface StaffSeed {
  id: string;
  basic: number | null;
}

// ─── PAYE helper (Nigerian progressive brackets) ──────────────────────────────

function computePAYE(gross: number): number {
  const annual = gross * 12;
  const relief = Math.max(200000, 0.01 * annual) + 0.2 * annual;
  const taxable = Math.max(0, annual - relief);

  const brackets = [
    { limit: 300000,   rate: 0.07 },
    { limit: 300000,   rate: 0.11 },
    { limit: 500000,   rate: 0.15 },
    { limit: 500000,   rate: 0.19 },
    { limit: 1600000,  rate: 0.21 },
    { limit: Infinity, rate: 0.24 },
  ];

  let tax = 0;
  let remaining = taxable;
  for (const b of brackets) {
    if (remaining <= 0) break;
    const chunk = Math.min(remaining, b.limit);
    tax += chunk * b.rate;
    remaining -= chunk;
  }

  return Math.round(tax / 12);
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function PayrollPage() {
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [salaryMonth, setSalaryMonth] = useState<SalaryMonth | null>(null);
  const [lines, setLines] = useState<SalaryLine[]>([]);
  const [editRow, setEditRow] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ basic: '', bonus: '', deduction: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [confirmLock, setConfirmLock] = useState(false);
  const [navMonth, setNavMonth] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('active');

  // ── Get school_id from session ──────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: u } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', data.user.id)
        .single();
      if (u) setSchoolId((u as { school_id: string }).school_id);
    });
  }, []);

  // ── Load / create salary month ──────────────────────────────────────────────
  const loadMonth = useCallback(async (m: number, y: number) => {
    if (!schoolId) return;
    setLoading(true);
    setEditRow(null);

    let { data: sm } = await supabase
      .from('salary_months')
      .select('*')
      .eq('school_id', schoolId)
      .eq('month', m)
      .eq('year', y)
      .single();

    if (!sm) {
      const { data: created } = await supabase
        .from('salary_months')
        .insert({ school_id: schoolId, month: m, year: y, status: 'open' })
        .select()
        .single();
      sm = created;

      if (sm) {
        const { data: staff } = await supabase
          .from('staff')
          .select('id, basic')
          .eq('school_id', schoolId)
          .eq('is_active', true);

        if (staff && staff.length > 0) {
          const seeds = (staff as StaffSeed[]).map(s => ({
            salary_month_id: (sm as SalaryMonth).id,
            staff_id: s.id,
            basic: s.basic ?? 0,
            bonus: 0,
            paye: computePAYE(s.basic ?? 0),
            deduction: 0,
          }));
          await supabase.from('salary_lines').insert(seeds);
        }
      }
    }

    setSalaryMonth(sm as SalaryMonth | null);

    if (!sm) { setLoading(false); return; }

    const { data: linesData } = await supabase
      .from('salary_lines')
      .select(`
        *,
        staff (
          id, surname, first_name, middle_name, position,
          account_number, account_name, bank_id, is_active,
          banks ( name )
        )
      `)
      .eq('salary_month_id', (sm as SalaryMonth).id)
      .order('staff(surname)');

    setLines((linesData as SalaryLine[]) ?? []);
    setLoading(false);
  }, [schoolId, supabase]);

  useEffect(() => {
    if (schoolId) loadMonth(navMonth.month, navMonth.year);
  }, [schoolId, navMonth, loadMonth]);

  // ── Toast ─────────────────────────────────────────────────────────────────
  function toast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }

  // ── Edit helpers ──────────────────────────────────────────────────────────
  // u2500u2500 Edit field handlers u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500
  function onBasicChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEditState(prev => ({ ...prev, basic: e.target.value }));
  }
  function onBonusChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEditState(prev => ({ ...prev, bonus: e.target.value }));
  }
  function onDeductionChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEditState(prev => ({ ...prev, deduction: e.target.value }));
  }

  function startEdit(line: SalaryLine) {
    if (salaryMonth?.status === 'locked') return;
    setEditRow(line.id);
    setEditState({
      basic: String(line.basic),
      bonus: String(line.bonus),
      deduction: String(line.deduction),
    });
  }

  async function saveEdit(line: SalaryLine) {
    setSaving(true);
    const basic = Number(editState.basic) || 0;
    const bonus = Number(editState.bonus) || 0;
    const deduction = Number(editState.deduction) || 0;
    const paye = computePAYE(basic + bonus);

    const { error } = await supabase
      .from('salary_lines')
      .update({ basic, bonus, paye, deduction })
      .eq('id', line.id);

    if (error) {
      toast('Error saving: ' + error.message);
    } else {
      toast('Saved');
      await loadMonth(navMonth.month, navMonth.year);
    }
    setSaving(false);
    setEditRow(null);
  }

  function cancelEdit() { setEditRow(null); }

  // ── Lock / Unlock ─────────────────────────────────────────────────────────
  async function toggleLock() {
    if (!salaryMonth) return;
    const newStatus = salaryMonth.status === 'locked' ? 'open' : 'locked';
    const { error } = await supabase
      .from('salary_months')
      .update({
        status: newStatus,
        locked_at: newStatus === 'locked' ? new Date().toISOString() : null,
      })
      .eq('id', salaryMonth.id);

    if (error) toast('Error: ' + error.message);
    else {
      setSalaryMonth({ ...salaryMonth, status: newStatus });
      toast(newStatus === 'locked' ? 'Month locked' : 'Month unlocked');
    }
    setConfirmLock(false);
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const isLocked = salaryMonth?.status === 'locked';

  const filteredLines = lines.filter(l => {
    const name = `${l.staff?.surname} ${l.staff?.first_name}`.toLowerCase();
    const matchesSearch = name.includes(search.toLowerCase());
    const matchesActive =
      filterActive === 'all'      ? true :
      filterActive === 'active'   ? l.staff?.is_active :
      !l.staff?.is_active;
    return matchesSearch && matchesActive;
  });

  const totals = filteredLines.reduce(
    (acc, l) => ({
      basic:     acc.basic     + l.basic,
      bonus:     acc.bonus     + l.bonus,
      gross:     acc.gross     + l.gross,
      paye:      acc.paye      + l.paye,
      deduction: acc.deduction + l.deduction,
      net_pay:   acc.net_pay   + l.net_pay,
    }),
    { basic: 0, bonus: 0, gross: 0, paye: 0, deduction: 0, net_pay: 0 }
  );

  function fmt(n: number) {
    return '₦' + n.toLocaleString('en-NG');
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page">
      {toastMsg && <div className="toast" role="alert">{toastMsg}</div>}

      <div className="page-header">
        <div>
          <h1>Payroll</h1>
          <p className="page-subtitle">
            {MONTHS[navMonth.month - 1]} {navMonth.year}
            {isLocked && (
              <span className="badge badge-warning" style={{ marginLeft: 8 }}>Locked</span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/dashboard/exports" className="btn-secondary">Export Files</Link>
          <button
            className={isLocked ? 'btn-secondary' : 'btn-danger'}
            onClick={() => setConfirmLock(true)}
          >
            {isLocked ? '🔓 Unlock Month' : '🔒 Lock Month'}
          </button>
        </div>
      </div>

      {/* Month navigator */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="month-nav">
          <button
            className="btn-ghost"
            onClick={() => {
              const d = new Date(navMonth.year, navMonth.month - 2);
              setNavMonth({ month: d.getMonth() + 1, year: d.getFullYear() });
            }}
          >← Prev</button>
          <span className="month-label">{MONTHS[navMonth.month - 1]} {navMonth.year}</span>
          <button
            className="btn-ghost"
            onClick={() => {
              const d = new Date(navMonth.year, navMonth.month);
              setNavMonth({ month: d.getMonth() + 1, year: d.getFullYear() });
            }}
          >Next →</button>
        </div>
      </div>

      {/* Summary metric cards */}
      <div className="metrics-row">
        <div className="metric-card">
          <div className="metric-label">Total Staff</div>
          <div className="metric-value">{filteredLines.length}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Gross</div>
          <div className="metric-value">{fmt(totals.gross)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total PAYE</div>
          <div className="metric-value">{fmt(totals.paye)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Deductions</div>
          <div className="metric-value">{fmt(totals.deduction)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Net Pay</div>
          <div className="metric-value highlight">{fmt(totals.net_pay)}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <input
          className="form-input"
          placeholder="Search staff..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        <div className="filter-tabs">
          {(['active', 'all', 'inactive'] as const).map(f => (
            <button
              key={f}
              className={filterActive === f ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
              onClick={() => setFilterActive(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        {loading ? (
          <div className="table-empty">Loading payroll data…</div>
        ) : filteredLines.length === 0 ? (
          <div className="table-empty">No salary lines found for this month.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>S/N</th>
                <th>Name</th>
                <th>Position</th>
                <th className="num-col">Basic (₦)</th>
                <th className="num-col">Bonus (₦)</th>
                <th className="num-col">Gross (₦)</th>
                <th className="num-col">PAYE (₦)</th>
                <th className="num-col">Deduction (₦)</th>
                <th className="num-col">Net Pay (₦)</th>
                {!isLocked && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredLines.map((line, idx) => {
                const isEditing = editRow === line.id;
                const fullName = `${line.staff?.surname} ${line.staff?.first_name}${line.staff?.middle_name ? ' ' + line.staff.middle_name : ''}`;

                const previewBasic      = isEditing ? (Number(editState.basic)     || 0) : line.basic;
                const previewBonus      = isEditing ? (Number(editState.bonus)     || 0) : line.bonus;
                const previewDeduction  = isEditing ? (Number(editState.deduction) || 0) : line.deduction;
                const previewGross      = previewBasic + previewBonus;
                const previewPaye       = isEditing ? computePAYE(previewGross) : line.paye;
                const previewNet        = previewGross - previewPaye - previewDeduction;

                return (
                  <tr
                    key={line.id}
                    className={`${isEditing ? 'row-editing' : ''} ${!line.staff?.is_active ? 'row-inactive' : ''}`}
                  >
                    <td className="sn-col">{idx + 1}</td>
                    <td>
                      <div className="staff-name">{fullName}</div>
                      <div className="staff-bank">
                        {line.staff?.banks?.name ?? '—'} · {line.staff?.account_number ?? '—'}
                      </div>
                    </td>
                    <td>{line.staff?.position}</td>

                    <td className="num-col">
                      {isEditing ? (
                        <input
                          className="cell-input"
                          type="number"
                          value={editState.basic}
                          onChange={onBasicChange}
                        />
                      ) : (
                        line.basic.toLocaleString()
                      )}
                    </td>
                    <td className="num-col">
                      {isEditing ? (
                        <input
                          className="cell-input"
                          type="number"
                          value={editState.bonus}
                          onChange={onBonusChange}
                        />
                      ) : (
                        line.bonus.toLocaleString()
                      )}
                    </td>

                    <td className="num-col">{previewGross.toLocaleString()}</td>
                    <td className="num-col paye-col">{previewPaye.toLocaleString()}</td>

                    <td className="num-col">
                      {isEditing ? (
                        <input
                          className="cell-input"
                          type="number"
                          value={editState.deduction}
                          onChange={onDeductionChange}
                        />
                      ) : (
                        line.deduction.toLocaleString()
                      )}
                    </td>

                    <td className={`num-col net-col${previewNet < 0 ? ' net-negative' : ''}`}>
                      {previewNet.toLocaleString()}
                    </td>

                    {!isLocked && (
                      <td className="actions-col">
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn-primary btn-sm"
                              onClick={() => saveEdit(line)}
                              disabled={saving}
                            >
                              {saving ? '…' : 'Save'}
                            </button>
                            <button className="btn-ghost btn-sm" onClick={cancelEdit}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button className="btn-ghost btn-sm" onClick={() => startEdit(line)}>
                            Edit
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="totals-row">
                <td colSpan={3}>Totals ({filteredLines.length} staff)</td>
                <td className="num-col">{totals.basic.toLocaleString()}</td>
                <td className="num-col">{totals.bonus.toLocaleString()}</td>
                <td className="num-col">{totals.gross.toLocaleString()}</td>
                <td className="num-col">{totals.paye.toLocaleString()}</td>
                <td className="num-col">{totals.deduction.toLocaleString()}</td>
                <td className="num-col">{totals.net_pay.toLocaleString()}</td>
                {!isLocked && <td />}
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Lock/Unlock confirm modal */}
      {confirmLock && (
        <div className="modal-overlay" onClick={() => setConfirmLock(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{isLocked ? 'Unlock Month?' : 'Lock Month?'}</h2>
            <p>
              {isLocked
                ? "Unlocking will allow edits to this month's payroll again."
                : `Locking ${MONTHS[navMonth.month - 1]} ${navMonth.year} will prevent further edits. You can unlock it later.`
              }
            </p>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setConfirmLock(false)}>Cancel</button>
              <button
                className={isLocked ? 'btn-primary' : 'btn-danger'}
                onClick={toggleLock}
              >
                {isLocked ? 'Unlock' : 'Lock Month'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}