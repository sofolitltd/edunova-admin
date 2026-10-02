"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, isAuthenticated } from "@/lib/auth";
import { api, batchApi, promoCodeApi, type Course, type Batch, type PromoCode, type PromoCodePayload } from "@/lib/api";
import { Plus, Edit, Trash2, X, Loader2, Ticket } from "lucide-react";
import { toast } from "sonner";

const emptyForm: PromoCodePayload = {
  code: "",
  discount_type: "percentage",
  discount_value: 10,
  course_id: null,
  batch_id: null,
  max_redemptions: null,
  expires_at: null,
  is_active: true,
};

export default function PromoCodesPage() {
  const router = useRouter();
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState<PromoCode | null>(null);
  const [form, setForm] = useState<PromoCodePayload>(emptyForm);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/admin/login"); return; }
    load();
  }, [router]);

  const load = async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const [codesData, coursesData, batchesData] = await Promise.all([
        promoCodeApi.list(token),
        api.getCourses(token),
        batchApi.getBatches(token),
      ]);
      setCodes(codesData);
      setCourses(coursesData);
      setBatches(batchesData);
    } catch { toast.error("Failed to load promo codes"); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (p: PromoCode) => {
    setEditingId(p.id);
    setForm({
      code: p.code,
      discount_type: p.discount_type,
      discount_value: p.discount_value,
      course_id: p.course_id,
      batch_id: p.batch_id,
      max_redemptions: p.max_redemptions,
      expires_at: p.expires_at ? p.expires_at.slice(0, 10) : null,
      is_active: p.is_active,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) { toast.error("Code is required"); return; }
    if (!form.discount_value || form.discount_value <= 0) { toast.error("Discount value must be greater than 0"); return; }
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      const payload: PromoCodePayload = {
        ...form,
        code: form.code.trim().toUpperCase(),
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      };
      if (editingId) {
        await promoCodeApi.update(token, editingId, payload);
        toast.success("Promo code updated");
      } else {
        await promoCodeApi.create(token, payload);
        toast.success("Promo code created");
      }
      resetForm();
      load();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleToggleActive = async (p: PromoCode) => {
    const token = getToken();
    if (!token) return;
    try {
      await promoCodeApi.update(token, p.id, {
        code: p.code,
        discount_type: p.discount_type,
        discount_value: p.discount_value,
        course_id: p.course_id,
        batch_id: p.batch_id,
        max_redemptions: p.max_redemptions,
        expires_at: p.expires_at,
        is_active: !p.is_active,
      });
      setCodes(prev => prev.map(c => c.id === p.id ? { ...c, is_active: !c.is_active } : c));
    } catch { toast.error("Failed to update status"); }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      await promoCodeApi.delete(token, showDelete.id);
      toast.success("Promo code deleted");
      setShowDelete(null);
      setCodes(prev => prev.filter(c => c.id !== showDelete.id));
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to delete"); }
    finally { setSaving(false); }
  };

  const inputClass = "w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  const restrictionLabel = (p: PromoCode) => {
    if (p.batch_id) return p.batch_name || `Batch #${p.batch_id}`;
    if (p.course_id) return p.course_name || `Course #${p.course_id}`;
    return "All courses/batches";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Promo Codes</h1>
          <p className="text-sm text-muted-foreground mt-1">Discount codes students can apply during online enrollment</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark transition-all">
          <Plus className="w-4 h-4" /> New Promo Code
        </button>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : codes.length === 0 ? (
          <div className="text-center py-12">
            <Ticket className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-3">No promo codes yet</p>
            <button onClick={() => { resetForm(); setShowForm(true); }} className="text-sm text-primary font-medium hover:underline">Create first code</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Discount</th>
                <th className="px-4 py-3 font-medium">Restriction</th>
                <th className="px-4 py-3 font-medium">Usage</th>
                <th className="px-4 py-3 font-medium">Expires</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {codes.map(p => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono font-semibold text-foreground">{p.code}</td>
                  <td className="px-4 py-3 text-foreground">
                    {p.discount_type === "percentage" ? `${p.discount_value}%` : `৳${p.discount_value}`}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{restrictionLabel(p)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.redemption_count}{p.max_redemptions ? ` / ${p.max_redemptions}` : " / ∞"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {p.expires_at ? new Date(p.expires_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggleActive(p)} className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${p.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {p.is_active ? "Active" : "Disabled"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => setShowDelete(p)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={resetForm}>
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h3 className="font-semibold text-foreground">{editingId ? "Edit" : "Create"} Promo Code</h3>
              <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Code *</label>
                <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="EID2026" className={`${inputClass} font-mono`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Discount Type *</label>
                  <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value as "percentage" | "fixed" })} className={inputClass}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (৳)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Value *</label>
                  <input type="number" min={1} value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Restrict to Course</label>
                  <select value={form.course_id ?? ""} onChange={(e) => setForm({ ...form, course_id: e.target.value ? Number(e.target.value) : null, batch_id: null })} className={inputClass}>
                    <option value="">Any course</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Restrict to Batch</label>
                  <select value={form.batch_id ?? ""} onChange={(e) => setForm({ ...form, batch_id: e.target.value ? Number(e.target.value) : null, course_id: null })} className={inputClass}>
                    <option value="">Any batch</option>
                    {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Max Redemptions</label>
                  <input type="number" min={1} value={form.max_redemptions ?? ""} onChange={(e) => setForm({ ...form, max_redemptions: e.target.value ? Number(e.target.value) : null })} placeholder="Unlimited" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Expires On</label>
                  <input type="date" value={form.expires_at ?? ""} onChange={(e) => setForm({ ...form, expires_at: e.target.value || null })} className={inputClass} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_active ?? true} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded border-border" />
                <label className="text-sm text-foreground">Active</label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={resetForm} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.code || !form.discount_value} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-all">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDelete(null)}>
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Delete Promo Code</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted-foreground">Delete <strong className="text-foreground">{showDelete.code}</strong>? This cannot be undone.</p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowDelete(null)} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive text-white text-sm font-medium hover:bg-destructive/90 disabled:opacity-50 transition-all">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
