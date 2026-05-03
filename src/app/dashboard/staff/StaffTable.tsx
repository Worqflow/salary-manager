"use client";

import { useState } from "react";
import StaffForm, { type StaffRow } from "./StaffForm";
import { deactivateStaff, reactivateStaff } from "./actions";

interface Department { id: string; name: string; }
interface Bank { id: string; name: string; }

interface StaffTableProps {
  staff: StaffRow[];
  departments: Department[];
  banks: Bank[];
}

export default function StaffTable({ staff, departments, banks }: StaffTableProps) {
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [filterDept, setFilterDept] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffRow | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d.name]));
  const bankMap = Object.fromEntries(banks.map((b) => [b.id, b.name]));

  const needsReviewCount = staff.filter((s) => s.needs_review).length;

  const filtered = staff.filter((s) => {
    const fullName = `${s.surname} ${s.first_name} ${s.middle_name ?? ""}`.toLowerCase();
    const matchSearch =
      !search ||
      fullName.includes(search.toLowerCase()) ||
      (s.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchActive =
      filterActive === "all" ||
      (filterActive === "active" && s.is_active) ||
      (filterActive === "inactive" && !s.is_active);
    const matchDept = filterDept === "all" || s.department_id === filterDept;
    return matchSearch && matchActive && matchDept;
  });

  function openAdd() {
    setEditStaff(null);
    setShowForm(true);
  }

  function openEdit(s: StaffRow) {
    setEditStaff(s);
    setShowForm(true);
  }

  async function handleToggleActive(s: StaffRow) {
    setActionError("");
    setActionLoading(s.id);
    try {
      if (s.is_active) {
        await deactivateStaff(s.id);
      } else {
        await reactivateStaff(s.id);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <>
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Staff</h1>
            <p className="page-subtitle">
              {staff.length} total &middot; {staff.filter((s) => s.is_active).length} active
            </p>
          </div>
          <button className="btn-primary" onClick={openAdd}>+ Add Staff</button>
        </div>

        {/* Needs-review warning */}
        {needsReviewCount > 0 && (
          <div className="review-banner" style={{ marginBottom: "1.25rem" }}>
            ⚠️ {needsReviewCount} staff member{needsReviewCount > 1 ? "s" : ""} need{needsReviewCount === 1 ? "s" : ""} review before payroll can be generated.
            Click <strong>Edit</strong> on the highlighted rows to complete their details.
          </div>
        )}

        {/* Toolbar */}
        <div className="toolbar">
          <input
            className="form-input toolbar-search"
            type="search"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="form-input toolbar-select"
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value as "all" | "active" | "inactive")}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            className="form-input toolbar-select"
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
          >
            <option value="all">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {actionError && (
          <p className="form-error" style={{ marginBottom: "1rem" }}>{actionError}</p>
        )}

        {filtered.length === 0 ? (
          <div className="empty-state"><p>No staff members found.</p></div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Position</th>
                  <th>Department</th>
                  <th>Bank</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className={s.needs_review ? "row-needs-review" : ""}>
                    <td>
                      <div className="td-primary">
                        {s.surname} {s.first_name}{s.middle_name ? ` ${s.middle_name}` : ""}
                        {s.needs_review && (
                          <span className="badge badge-deduction" style={{ marginLeft: "0.5rem", fontSize: "0.7rem" }}>
                            Review
                          </span>
                        )}
                      </div>
                      {s.email && <div className="td-muted">{s.email}</div>}
                    </td>
                    <td>{s.position}</td>
                    <td>{deptMap[s.department_id] ?? "—"}</td>
                    <td>
                      <div>{s.bank_id ? bankMap[s.bank_id] ?? "—" : "—"}</div>
                      {s.account_number && (
                        <div className="td-muted td-mono">{s.account_number}</div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${s.is_active ? "badge-active" : "badge-inactive"}`}>
                        {s.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn-ghost btn-sm" onClick={() => openEdit(s)}>
                          Edit
                        </button>
                        <button
                          className={`btn-sm ${s.is_active ? "btn-danger" : "btn-secondary"}`}
                          disabled={actionLoading === s.id}
                          onClick={() => handleToggleActive(s)}
                        >
                          {actionLoading === s.id ? "…" : s.is_active ? "Deactivate" : "Reactivate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <StaffForm
          departments={departments}
          banks={banks}
          editStaff={editStaff}
          onClose={() => setShowForm(false)}
        />
      )}
    </>
  );
}