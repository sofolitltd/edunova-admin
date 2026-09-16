"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getToken, isAuthenticated } from "@/lib/auth";
import { paymentApi, api, type Payment, type User } from "@/lib/api";
import { Plus, Check, X, Trash2, Search, CreditCard, Loader2, Receipt, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const METHODS = [
  { value: "bkash", label: "bKash", color: "bg-pink-100 text-pink-700 border-pink-200" },
  { value: "nagad", label: "Nagad", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "card", label: "Card", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "bank", label: "Bank", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "cash", label: "Cash", color: "bg-green-100 text-green-700 border-green-200" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  verified: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

export default function PaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    user_id: 0,
    amount: 0,
    method: "bkash",
    transaction_id: "",
    sender_number: "",
    month: MONTHS[new Date().getMonth()],
    year: currentYear,
    notes: "",
  });

  const [showDelete, setShowDelete] = useState<Payment | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const loadPayments = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const data = await paymentApi.getPayments(token, filterStatus === "all" ? undefined : filterStatus);
      setPayments(data);
    } catch {
      toast.error("Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/admin/login"); return; }
    loadPayments();
  }, [loadPayments, router]);

  const loadUsers = async () => {
    const token = getToken();
    if (!token) return;
    setLoadingUsers(true);
    try {
      const data = await api.getUsers(token, 1, "");
      setUsers(data.users);
    } catch {
      toast.error("Failed to load students");
    } finally {
      setLoadingUsers(false);
    }
  };

  const resetForm = () => {
    setForm({ user_id: 0, amount: 0, method: "bkash", transaction_id: "", sender_number: "", month: MONTHS[new Date().getMonth()], year: currentYear, notes: "" });
    setShowForm(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
    loadUsers();
  };

  const handleCreate = async () => {
    if (!form.user_id) { toast.error("Select a student"); return; }
    if (form.amount <= 0) { toast.error("Amount must be greater than 0"); return; }
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      await paymentApi.createPayment(token, form);
      toast.success("Payment recorded");
      resetForm();
      loadPayments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async (id: number) => {
    const token = getToken();
    if (!token) return;
    try {
      await paymentApi.verify(token, id);
      toast.success("Payment verified");
      loadPayments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to verify");
    }
  };

  const handleReject = async (id: number) => {
    const token = getToken();
    if (!token) return;
    try {
      await paymentApi.reject(token, id);
      toast.success("Payment rejected");
      loadPayments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reject");
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      await paymentApi.deletePayment(token, showDelete.id);
      toast.success("Payment deleted");
      setShowDelete(null);
      loadPayments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setSaving(false);
    }
  };

  const totalCollected = payments
    .filter((p) => p.status === "verified")
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingCount = payments.filter((p) => p.status === "pending").length;

  const filteredPayments = payments.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.user_name.toLowerCase().includes(q) ||
      p.receipt_number.toLowerCase().includes(q) ||
      p.transaction_id.toLowerCase().includes(q) ||
      p.method.toLowerCase().includes(q)
    );
  });

  const getMethodStyle = (method: string) =>
    METHODS.find((m) => m.value === method)?.color || "bg-secondary text-secondary-foreground";

  const formatCurrency = (a: number) => `৳${a.toLocaleString()}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fee Payments & Receipts</h1>
          <p className="text-sm text-muted-foreground mt-1">{payments.length} total payments</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark transition-all"
        >
          <Plus className="w-4 h-4" />
          Record Payment
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Collected</p>
            <p className="text-xl font-bold text-foreground">{formatCurrency(totalCollected)}</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
            <Clock className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-xl font-bold text-foreground">{pendingCount}</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Receipt className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Payments</p>
            <p className="text-xl font-bold text-foreground">{payments.length}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs + Search */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {["all", "pending", "verified", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                filterStatus === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payments..."
            className="pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-muted-foreground">Loading...</div>
        ) : filteredPayments.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {search ? "No payments match your search" : "No payments found"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Student</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Method</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Receipt</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-right px-6 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-foreground">{p.user_name}</div>
                      <div className="text-xs text-muted-foreground">{p.user_mobile}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-foreground">{formatCurrency(p.amount)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${getMethodStyle(p.method)}`}>
                        {p.method}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${STATUS_COLORS[p.status] || "bg-secondary text-secondary-foreground"}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground font-mono">{p.receipt_number || "-"}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {p.month} {p.year}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {p.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleVerify(p.id)}
                              className="p-1.5 rounded-lg hover:bg-green-500/10 text-muted-foreground hover:text-green-600"
                              title="Verify"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleReject(p.id)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-600"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setShowDelete(p)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Create Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={resetForm}>
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Record Payment</h3>
              <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Student *</label>
                {loadingUsers ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-secondary text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading students...
                  </div>
                ) : (
                  <select
                    value={form.user_id}
                    onChange={(e) => setForm({ ...form, user_id: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 pr-10 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none bg-no-repeat bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b7280%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22></polyline></svg>)] bg-[position:right_0.75rem_center]"
                  >
                    <option value={0}>Select student</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.full_name} ({u.mobile})</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Amount (৳) *</label>
                  <input
                    type="number"
                    value={form.amount || ""}
                    onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Method *</label>
                  <select
                    value={form.method}
                    onChange={(e) => setForm({ ...form, method: e.target.value })}
                    className="w-full px-3 py-2.5 pr-10 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none bg-no-repeat bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b7280%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22></polyline></svg>)] bg-[position:right_0.75rem_center]"
                  >
                    {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Transaction ID</label>
                <input
                  type="text"
                  value={form.transaction_id}
                  onChange={(e) => setForm({ ...form, transaction_id: e.target.value })}
                  placeholder="e.g. TRX123456"
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Sender Number</label>
                <input
                  type="text"
                  value={form.sender_number}
                  onChange={(e) => setForm({ ...form, sender_number: e.target.value })}
                  placeholder="e.g. 01XXXXXXXXX"
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Month</label>
                  <select
                    value={form.month}
                    onChange={(e) => setForm({ ...form, month: e.target.value })}
                    className="w-full px-3 py-2.5 pr-10 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none bg-no-repeat bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b7280%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22></polyline></svg>)] bg-[position:right_0.75rem_center]"
                  >
                    {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Year</label>
                  <select
                    value={form.year}
                    onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 pr-10 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none bg-no-repeat bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b7280%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22></polyline></svg>)] bg-[position:right_0.75rem_center]"
                  >
                    {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional notes..."
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={resetForm} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.user_id || form.amount <= 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDelete(null)}>
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Delete Payment</h3>
              <button onClick={() => setShowDelete(null)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted-foreground">
                Delete payment <strong className="text-foreground">{formatCurrency(showDelete.amount)}</strong> from <strong className="text-foreground">{showDelete.user_name}</strong>?
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowDelete(null)} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive text-white text-sm font-medium hover:bg-destructive/90 disabled:opacity-50 transition-all"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
