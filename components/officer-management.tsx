"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, LoaderCircle, Plus, ShieldCheck, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Officer = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  department?: string;
  role: "CITIZEN" | "OFFICER" | "ADMIN";
  active: boolean;
};

type Department = { _id: string; name: string; categories: string[]; active: boolean };
const categoryOptions = ["Road Damage", "Garbage", "Drainage", "Sewage", "Streetlight", "Water Supply", "Sanitation", "Flooding", "Infrastructure", "Public Safety", "Other"];
const emptyOfficerForm = { name: "", email: "", password: "", phone: "", department: "" };

export function OfficerManagement() {
  const [users, setUsers] = useState<Officer[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [form, setForm] = useState(emptyOfficerForm);
  const [departmentForm, setDepartmentForm] = useState({ name: "", categories: [] as string[] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const officers = useMemo(() => users.filter((user) => user.role === "OFFICER"), [users]);

  async function load() {
    setLoading(true);
    try {
      const [usersResponse, departmentsResponse] = await Promise.all([fetch("/api/admin/users"), fetch("/api/departments")]);
      const usersPayload = await usersResponse.json();
      const departmentsPayload = await departmentsResponse.json();
      if (!usersResponse.ok) throw new Error(usersPayload.error || "Unable to load users");
      if (!departmentsResponse.ok) throw new Error(departmentsPayload.error || "Unable to load departments");
      setUsers(usersPayload.users);
      setDepartments(departmentsPayload.departments);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load administration data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createOfficer(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to create officer");

      setForm(emptyOfficerForm);
      setNotice(payload.message || "Officer account created.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create officer");
    } finally {
      setSaving(false);
    }
  }

  async function updateOfficer(id: string, values: Record<string, unknown>) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...values }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to update officer");
      setUsers((current) => current.map((user) => user._id === id ? { ...user, ...payload.user } : user));
      setNotice("Officer account updated.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update officer");
    } finally {
      setSaving(false);
    }
  }

  async function createDepartment(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...departmentForm, active: true }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to add department");
      setDepartmentForm({ name: "", categories: [] });
      setNotice("Department mapping added. Future AI analyses will use it.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to add department");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="grid gap-7 xl:grid-cols-[.95fr_1.05fr]">
        <Card className="p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-civic-50 text-civic-700"><UserCog size={20} /></span>
            <div>
              <h2 className="font-extrabold text-ink">Add an officer</h2>
              <p className="text-sm text-slate-500">Create a restricted municipal staff account.</p>
            </div>
          </div>

          <form className="mt-6 space-y-4" onSubmit={createOfficer}>
            <Field label="Officer name"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
            <Field label="Mobile number"><Input type="tel" autoComplete="off" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required placeholder="+91 XXXXXXXXX" /></Field>
            <Field label="Email address"><Input type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></Field>
            <Field label="Temporary password"><Input type="password" autoComplete="new-password" minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></Field>
            <Field label="Department">
              <input className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-civic-500 focus:ring-2 focus:ring-civic-100" list="department-options" value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} required placeholder="e.g. Roads Department" />
              <datalist id="department-options">{departments.filter((item) => item.active).map((item) => <option key={item._id} value={item.name} />)}</datalist>
            </Field>
            <Button className="mt-2 w-full" disabled={saving}>{saving ? <LoaderCircle className="animate-spin" size={17} /> : <Plus size={17} />}{saving ? "Creating account…" : "Create officer account"}</Button>
          </form>
        </Card>

        <Card className="p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Building2 size={20} /></span>
            <div><h2 className="font-extrabold text-ink">Department routing</h2><p className="text-sm text-slate-500">Maps complaint categories to municipal teams.</p></div>
          </div>
          <form className="mt-6 space-y-4" onSubmit={createDepartment}>
            <Field label="Department name"><Input value={departmentForm.name} onChange={(event) => setDepartmentForm({ ...departmentForm, name: event.target.value })} placeholder="e.g. Parks Department" required /></Field>
            <fieldset>
              <legend className="text-sm font-bold text-slate-700">Categories handled</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {categoryOptions.map((category) => (
                  <label key={category} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-2 text-sm text-slate-700">
                    <input type="checkbox" checked={departmentForm.categories.includes(category)} onChange={(event) => setDepartmentForm({ ...departmentForm, categories: event.target.checked ? [...departmentForm.categories, category] : departmentForm.categories.filter((value) => value !== category) })} />
                    {category}
                  </label>
                ))}
              </div>
            </fieldset>
            <Button className="mt-2 w-full" variant="secondary" disabled={saving}>{saving ? <LoaderCircle className="animate-spin" size={17} /> : <Plus size={17} />}{saving ? "Saving…" : "Add department mapping"}</Button>
          </form>
        </Card>
      </section>

      {(error || notice) && <div className={`mt-7 flex gap-2 rounded-xl p-4 text-sm font-medium ${error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>{error ? <ShieldCheck size={18} /> : <CheckCircle2 size={18} />}{error || notice}</div>}

      <Card className="mt-7 overflow-hidden">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
          <div><h2 className="font-extrabold text-ink">Officer accounts</h2><p className="mt-1 text-sm text-slate-500">Assign officers from any complaint record after creating their account.</p></div>
          <span className="rounded-full bg-civic-50 px-3 py-1 text-sm font-bold text-civic-700">{officers.length} officer{officers.length === 1 ? "" : "s"}</span>
        </div>
        {loading ? <div className="grid min-h-48 place-items-center text-sm text-slate-500"><LoaderCircle className="mr-2 inline animate-spin" size={18} />Loading officer accounts…</div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Officer</th><th className="px-5 py-3">Department</th><th className="px-5 py-3">Account</th><th className="px-5 py-3">Action</th></tr></thead>
              <tbody>
                {officers.map((officer) => (
                  <tr key={officer._id} className="border-t border-slate-100">
                    <td className="px-5 py-4"><p className="font-bold text-slate-700">{officer.name}</p><p className="text-slate-500">{officer.email || "No email address"}</p><p className="text-slate-500">{officer.phone || "No mobile number"}</p></td>
                    <td className="px-5 py-4"><input className="min-h-9 w-52 rounded-lg border border-slate-300 px-2 text-sm" defaultValue={officer.department || ""} onBlur={(event) => { if (event.target.value !== officer.department) void updateOfficer(officer._id, { department: event.target.value }); }} /></td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${officer.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{officer.active ? "Active" : "Inactive"}</span></td>
                    <td className="px-5 py-4"><Button variant={officer.active ? "outline" : "primary"} className="min-h-9 px-3" onClick={() => void updateOfficer(officer._id, { active: !officer.active })} disabled={saving}>{officer.active ? "Deactivate" : "Activate"}</Button></td>
                  </tr>
                ))}
                {!officers.length && <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-500">No officers yet. Create the first officer account above.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mt-7 p-5">
        <h2 className="font-extrabold text-ink">Active department mappings</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {departments.map((department) => <div key={department._id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><p className="font-bold text-slate-700">{department.name}</p><span className={`rounded-full px-2 py-1 text-xs font-bold ${department.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{department.active ? "Active" : "Inactive"}</span></div><p className="mt-2 text-sm text-slate-500">{department.categories.join(" · ")}</p></div>)}
          {!departments.length && <p className="text-sm text-slate-500">No department mappings yet.</p>}
        </div>
      </Card>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-bold text-slate-700"><span>{label}</span><div className="mt-1.5">{children}</div></label>;
}
