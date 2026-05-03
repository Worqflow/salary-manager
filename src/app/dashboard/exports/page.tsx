'use client';

import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import * as XLSX from 'xlsx';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SalaryMonth {
  id: string;
  school_id: string;
  month: number;
  year: number;
  status: 'open' | 'locked';
}

interface ExportLine {
  id: string;
  staff_id: string;
  basic: number;
  bonus: number;
  gross: number;
  paye: number;
  deduction: number;
  net_pay: number;
  staff: {
    surname: string;
    first_name: string;
    middle_name: string | null;
    position: string;
    account_number: string | null;
    account_name: string | null;
    bank_id: string | null;
    banks: { id: string; name: string; sort_code: string | null } | null;
  };
}

interface BankGroup {
  bankId: string;
  bankName: string;
  sortCode: string | null;
  lines: ExportLine[];
  total: number;
}

// XLSX row: each cell can be string, number, or undefined
type XlsxRow = (string | number | undefined)[];

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function ExportsPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [months, setMonths] = useState<SalaryMonth[]>([]);
  const [selectedMonthId, setSelectedMonthId] = useState<string>('');
  const [bankGroups, setBankGroups] = useState<BankGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [schoolName] = useState('Gladys Schools');

  // ── Bootstrap ────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }: { data: { user: { id: string } | null } }) => {
      if (!data.user) return;
      const { data: u } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', data.user.id)
        .single();
      if (u) setSchoolId((u as { school_id: string }).school_id);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load salary months list ──────────────────────────────────────────────
  useEffect(() => {
    if (!schoolId) return;
    supabase
      .from('salary_months')
      .select('*')
      .eq('school_id', schoolId)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .then(({ data }: { data: SalaryMonth[] | null }) => {
        if (data) {
          setMonths(data);
          if (data.length > 0) setSelectedMonthId(data[0].id);
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  // ── Load lines for selected month ────────────────────────────────────────
  const loadLines = useCallback(async (monthId: string) => {
    if (!monthId) return;
    setLoading(true);

    const { data } = await supabase
      .from('salary_lines')
      .select(`
        *,
        staff (
          surname, first_name, middle_name, position,
          account_number, account_name, bank_id,
          banks ( id, name, sort_code )
        )
      `)
      .eq('salary_month_id', monthId)
      .gt('net_pay', 0)
      .order('staff(surname)');

    const lines = (data as ExportLine[] | null) ?? [];

    // Group by bank
    const map = new Map<string, BankGroup>();

    for (const line of lines) {
      const bank = line.staff?.banks;
      const key = bank?.id ?? 'NO_BANK';
      const name = bank?.name ?? 'Unknown Bank';
      const sortCode = bank?.sort_code ?? null;

      if (!map.has(key)) {
        map.set(key, { bankId: key, bankName: name, sortCode, lines: [], total: 0 });
      }
      const group = map.get(key)!;
      group.lines.push(line);
      group.total += line.net_pay;
    }

    const groups = Array.from(map.values()).sort((a, b) =>
      a.bankName.localeCompare(b.bankName)
    );

    setBankGroups(groups);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedMonthId) loadLines(selectedMonthId);
  }, [selectedMonthId, loadLines]);

  // ── Toast ─────────────────────────────────────────────────────────────────
  function toast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedMonth = months.find(m => m.id === selectedMonthId);
  const monthLabel = selectedMonth
    ? `${MONTHS[selectedMonth.month - 1]} ${selectedMonth.year}`
    : '';

  const grandTotal = bankGroups.reduce((s, g) => s + g.total, 0);
  const grandCount = bankGroups.reduce((s, g) => s + g.lines.length, 0);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function staffFullName(line: ExportLine): string {
    return `${line.staff.surname} ${line.staff.first_name}${line.staff.middle_name ? ' ' + line.staff.middle_name : ''}`;
  }

  const bankColWidths = [
    { wch: 5 }, { wch: 30 }, { wch: 15 }, { wch: 30 },
    { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
  ];

  function bankSheetRows(group: BankGroup): XlsxRow[] {
    const header: XlsxRow[] = [
      [`${schoolName} - Salary Payment`],
      [`Month: ${monthLabel}`],
      [`Bank: ${group.bankName}${group.sortCode ? ' (' + group.sortCode + ')' : ''}`],
      [],
      ['S/N', 'Account Name', 'Account Number', 'Position', 'Basic', 'Bonus', 'Gross', 'PAYE', 'Deduction', 'Net Pay'],
    ];

    const dataRows: XlsxRow[] = group.lines.map((line, i): XlsxRow => [
      i + 1,
      line.staff.account_name ?? staffFullName(line),
      line.staff.account_number ?? '',
      line.staff.position,
      line.basic,
      line.bonus,
      line.gross,
      line.paye,
      line.deduction,
      line.net_pay,
    ]);

    const totalsRow: XlsxRow = [
      'TOTAL', '', '', '',
      group.lines.reduce((s, l) => s + l.basic, 0),
      group.lines.reduce((s, l) => s + l.bonus, 0),
      group.lines.reduce((s, l) => s + l.gross, 0),
      group.lines.reduce((s, l) => s + l.paye, 0),
      group.lines.reduce((s, l) => s + l.deduction, 0),
      group.total,
    ];

    return [...header, ...dataRows, totalsRow];
  }

  // ── Download single bank ──────────────────────────────────────────────────
  function downloadBank(group: BankGroup) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(bankSheetRows(group));
    ws['!cols'] = bankColWidths;
    XLSX.utils.book_append_sheet(wb, ws, group.bankName.substring(0, 31));
    XLSX.writeFile(wb, `${monthLabel}_${group.bankName.replace(/\s+/g, '_')}.xlsx`);
    toast(`Downloaded ${group.bankName} sheet`);
  }

  // ── Download all banks ────────────────────────────────────────────────────
  function downloadAll() {
    if (bankGroups.length === 0) return;
    const wb = XLSX.utils.book_new();

    const summaryRows: XlsxRow[] = [
      [`${schoolName} - Salary Summary`],
      [`Month: ${monthLabel}`],
      [],
      ['Bank', 'Staff Count', 'Total Net Pay'],
      ...bankGroups.map((g): XlsxRow => [g.bankName, g.lines.length, g.total]),
      ['GRAND TOTAL', grandCount, grandTotal],
    ];
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
    summaryWs['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    bankGroups.forEach(group => {
      const ws = XLSX.utils.aoa_to_sheet(bankSheetRows(group));
      ws['!cols'] = bankColWidths;
      XLSX.utils.book_append_sheet(wb, ws, group.bankName.substring(0, 31));
    });

    XLSX.writeFile(wb, `${monthLabel}_All_Banks_Payroll.xlsx`);
    toast('Downloaded all banks');
  }

  // ── Download full schedule ────────────────────────────────────────────────
  function downloadFullSchedule() {
    if (bankGroups.length === 0) return;
    const allLines = bankGroups
      .flatMap(g => g.lines)
      .sort((a, b) => staffFullName(a).localeCompare(staffFullName(b)));

    const rows: XlsxRow[] = [
      [`${schoolName} - Staff Salary`],
      [monthLabel],
      [],
      ['S/N', 'Names', 'Position', 'Basic', 'Bonus', 'Gross', 'PAYE', 'Deduction', 'Net Pay', 'Account No', 'Bank Name'],
      ...allLines.map((line, i): XlsxRow => [
        i + 1,
        staffFullName(line),
        line.staff.position,
        line.basic,
        line.bonus,
        line.gross,
        line.paye,
        line.deduction,
        line.net_pay,
        line.staff.account_number ?? '',
        line.staff.banks?.name ?? '',
      ]),
      [
        'Total', '', '',
        allLines.reduce((s, l) => s + l.basic, 0),
        allLines.reduce((s, l) => s + l.bonus, 0),
        allLines.reduce((s, l) => s + l.gross, 0),
        allLines.reduce((s, l) => s + l.paye, 0),
        allLines.reduce((s, l) => s + l.deduction, 0),
        grandTotal,
        '', '',
      ],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 5 }, { wch: 30 }, { wch: 30 }, { wch: 12 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 15 }, { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Full Schedule');
    XLSX.writeFile(wb, `${monthLabel}_Full_Salary_Schedule.xlsx`);
    toast('Downloaded full schedule');
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page">
      {toastMsg && <div className="toast">{toastMsg}</div>}

      <div className="page-header">
        <div>
          <h1>Export Files</h1>
          <p className="page-subtitle">Download salary sheets grouped by bank</p>
        </div>
      </div>

      {/* Month selector */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="form-row-2">
          <div className="form-group">
            <label className="form-label">Select Month</label>
            <select
              className="form-input"
              value={selectedMonthId}
              onChange={e => setSelectedMonthId(e.target.value)}
            >
              {months.length === 0 && <option value="">No months found</option>}
              {months.map(m => (
                <option key={m.id} value={m.id}>
                  {MONTHS[m.month - 1]} {m.year}
                  {m.status === 'locked' ? ' 🔒' : ' (open)'}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <button
              className="btn-primary"
              onClick={downloadAll}
              disabled={bankGroups.length === 0 || loading}
            >
              ⬇ All Banks (.xlsx)
            </button>
            <button
              className="btn-secondary"
              onClick={downloadFullSchedule}
              disabled={bankGroups.length === 0 || loading}
            >
              ⬇ Full Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      {!loading && bankGroups.length > 0 && (
        <div className="metrics-row" style={{ marginBottom: 24 }}>
          <div className="metric-card">
            <div className="metric-label">Banks</div>
            <div className="metric-value">{bankGroups.length}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Total Staff</div>
            <div className="metric-value">{grandCount}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Grand Total Net Pay</div>
            <div className="metric-value highlight">
              ₦{grandTotal.toLocaleString('en-NG')}
            </div>
          </div>
        </div>
      )}

      {/* Bank groups */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          Loading export data…
        </div>
      ) : bankGroups.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          No payroll data found for this month. Make sure staff have net pay &gt; 0.
        </div>
      ) : (
        <div className="export-groups">
          {bankGroups.map(group => (
            <div className="card export-group" key={group.bankId}>
              <div className="export-group-header">
                <div>
                  <h3 className="export-bank-name">{group.bankName}</h3>
                  {group.sortCode && (
                    <span className="export-sort-code">Sort code: {group.sortCode}</span>
                  )}
                </div>
                <div className="export-group-meta">
                  <span className="badge">{group.lines.length} staff</span>
                  <span className="export-total">₦{group.total.toLocaleString('en-NG')}</span>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => downloadBank(group)}
                  >
                    ⬇ Download
                  </button>
                </div>
              </div>

              <details>
                <summary className="export-summary-toggle">
                  View {group.lines.length} staff
                </summary>
                <table className="data-table export-detail-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Account Name</th>
                      <th>Account No</th>
                      <th className="num-col">Net Pay (₦)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.lines.map(line => (
                      <tr key={line.id}>
                        <td>{staffFullName(line)}</td>
                        <td>{line.staff.account_name ?? staffFullName(line)}</td>
                        <td className="mono">{line.staff.account_number ?? '—'}</td>
                        <td className="num-col">{line.net_pay.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="totals-row">
                      <td colSpan={3}>Bank Total</td>
                      <td className="num-col">₦{group.total.toLocaleString('en-NG')}</td>
                    </tr>
                  </tfoot>
                </table>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}