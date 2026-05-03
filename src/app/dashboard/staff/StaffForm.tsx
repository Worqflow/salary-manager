"use client";

import { useState, useEffect } from "react";
import { addStaff, updateStaff, type StaffFormData } from "./actions";

interface Department { id: string; name: string; }
interface Bank { id: string; name: string; }

export interface StaffRow {
  id: string;
  surname: string;
  first_name: string;
  middle_name: string | null;
  position: string;
  department_id: string;
  email: string | null;
  phone: string | null;
  tax_id: string | null;
  pension_pin: string | null;
  nhf_number: string | null;
  staff_number: string | null;
  bank_id: string | null;
  account_number: string | null;
  account_name: string | null;
  is_active: boolean;
  needs_review: boolean;
}

interface StaffFormProps {
  departments: Department[];
  banks: Bank[];
  editStaff?: StaffRow | null;
  onClose: () => void;
}

type Tab = "info" | "payroll";

const EMPTY: StaffFormData = {
  surname: "",
  first_name: "",
  middle_name: "",
  position: "",
  department_id: "",
  email: "",
  phone: "",
  tax_id: "",
  pension_pin: "",
  nhf_number: "",
  staff_number: "",
  bank_id: "",
  account_number: "",
  account_name: "",
};

export default function StaffForm({ departments, banks, editStaff, onClose }: StaffFormProps) {
  const isEditing = !!editStaff;
  const [tab, setTab] = useState<Tab>("info");
  const [form, setForm] = useState<StaffFormData>({
    ...EMPTY,
    department_id: departments[0]?.id ?? "",
    bank_id: banks[0]?.id ?? "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editStaff) {
      setForm({
        surname:       editStaff.surname ?? "",
        first_name:    editStaff.first_name ?? "",
        middle_name:   editStaff.middle_name ?? "",
        position:      editStaff.position ?? "",
        department_id: editStaff.department_id ?? departments[0]?.id ?? "",
        email:         editStaff.email ?? "",
        phone:         editStaff.phone ?? "",
        tax_id:        editStaff.tax_id ?? "",
        pension_pin:   editStaff.pension_pin ?? "",
        nhf_number:    editStaff.nhf_number ?? "",
        staff_number:  editStaff.staff_number ?? "",
        bank_id:       editStaff.bank_id ?? banks[0]?.id ?? "",
        account_number: editStaff.account_number ?? "",
        account_name:  editStaff.account_name ?? "",
      });
    }
  }, [editStaff]);

  function set(field: keyof StaffFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isEditing && editStaff) {
        await updateStaff(editStaff.id, form);
      } else {
        await addStaff(form);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 600, width: "100%" }}>
        <h2 className="modal-title">
          {isEditing
            ? `Edit — ${editStaff!.surname} ${editStaff!.first_name}`
            : "Add New Staff"}
          {isEditing && editStaff!.needs_review && (
            <span className="badge badge-deduction" style={{ marginLeft: "0.75rem", fontSize: "0.75rem" }}>
              Needs Review
            </span>
          )}
        </h2>

        {/* Tabs */}
        <div className="form-tabs">
          <button
            type="button"
            className={`form-tab ${tab === "info" ? "form-tab--active" : ""}`}
            onClick={() => setTab("info")}
          >
            Personal Info
          </button>
          <button
            type="button"
            className={`form-tab ${tab === "payroll" ? "form-tab--active" : ""}`}
            onClick={() => setTab("payroll")}
          >
            Payroll &amp; Bank
          </button>
        </div>

        <form onSubmit={handleSubmit}>

          {/* ── Tab 1: Personal Info ── */}
          {tab === "info" && (
            <>
              <div className="form-row-3">
                <div className="form-group">
                  <label className="form-label" htmlFor="surname">Surname *</label>
                  <input id="surname" className="form-input" value={form.surname}
                    onChange={(e) => set("surname", e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="first_name">First Name *</label>
                  <input id="first_name" className="form-input" value={form.first_name}
                    onChange={(e) => set("first_name", e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="middle_name">Middle Name</label>
                  <input id="middle_name" className="form-input" value={form.middle_name}
                    onChange={(e) => set("middle_name", e.target.value)} />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="position">Position *</label>
                  <input id="position" className="form-input" value={form.position}
                    onChange={(e) => set("position", e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="department_id">Department *</label>
                  <select id="department_id" className="form-input" value={form.department_id}
                    onChange={(e) => set("department_id", e.target.value)} required>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="email">Email</label>
                  <input id="email" type="email" className="form-input" value={form.email}
                    onChange={(e) => set("email", e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="phone">Phone</label>
                  <input id="phone" className="form-input" value={form.phone}
                    onChange={(e) => set("phone", e.target.value)} />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="staff_number">Staff Number</label>
                  <input id="staff_number" className="form-input" value={form.staff_number}
                    onChange={(e) => set("staff_number", e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="tax_id">Tax ID (TIN)</label>
                  <input id="tax_id" className="form-input" value={form.tax_id}
                    onChange={(e) => set("tax_id", e.target.value)} />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="pension_pin">Pension PIN (RSA)</label>
                  <input id="pension_pin" className="form-input" value={form.pension_pin}
                    onChange={(e) => set("pension_pin", e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="nhf_number">NHF Number</label>
                  <input id="nhf_number" className="form-input" value={form.nhf_number}
                    onChange={(e) => set("nhf_number", e.target.value)} />
                </div>
              </div>
            </>
          )}

          {/* ── Tab 2: Payroll & Bank ── */}
          {tab === "payroll" && (
            <>
              {isEditing && editStaff!.needs_review && (
                <div className="review-banner">
                  ⚠️ This staff member has no salary set. Please confirm their details before generating payroll.
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="bank_id">Bank</label>
                <select id="bank_id" className="form-input" value={form.bank_id}
                  onChange={(e) => set("bank_id", e.target.value)}>
                  <option value="">— Select bank —</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="account_number">Account Number</label>
                  <input id="account_number" className="form-input" value={form.account_number}
                    onChange={(e) => set("account_number", e.target.value)} maxLength={10} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="account_name">Account Name</label>
                  <input id="account_name" className="form-input" value={form.account_name}
                    onChange={(e) => set("account_name", e.target.value)} />
                </div>
              </div>

              <p className="form-hint">
                Basic salary and allowances are edited on the Payroll page per salary month.
              </p>
            </>
          )}

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            {tab === "info" ? (
              <>
                <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
                  Cancel
                </button>
                <button type="button" className="btn-primary" onClick={() => setTab("payroll")}>
                  Next: Payroll &amp; Bank →
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn-secondary" onClick={() => setTab("info")} disabled={loading}>
                  ← Back
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? "Saving…" : isEditing ? "Save Changes" : "Add Staff"}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}