"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, type Enrollment } from "@/lib/api";
import { getToken } from "@/lib/auth";
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Filter,
  CreditCard,
  Smartphone,
  User,
  Phone,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/30",
  approved: "bg-success/10 text-success border-success/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export default function EnrollmentsPage() {
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [detailEnrollment, setDetailEnrollment] = useState<Enrollment | null>(null);

  const fetchEnrollments = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.push("/admin/login");
      return;
    }
    try {
      const data = await api.getEnrollments(token, page, statusFilter, search);
      setEnrollments(data.enrollments);
      setTotalPages(data.total_pages);
      setTotal(data.total);
    } catch {
      toast.error("Failed to load enrollments");
    } finally {
      setLoading(false);
    }
  }, [router, page, statusFilter, search]);

  useEffect(() => {
    setLoading(true);
    fetchEnrollments();
  }, [fetchEnrollments]);

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const updateStatus = async (id: number, newStatus: string) => {
    const token = getToken();
    if (!token) return;
    setUpdatingId(id);
    try {
      const updated = await api.updateEnrollmentStatus(token, id, newStatus);
      setEnrollments((prev) => prev.map((e) => (e.id === id ? updated : e)));
      toast.success(`Enrollment ${newStatus}`);
    } catch {
      toast.error("Failed to update enrollment");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this enrollment? This cannot be undone.")) return;
    const token = getToken();
    if (!token) return;
    try {
      await api.deleteEnrollment(token, id);
      setEnrollments((prev) => prev.filter((e) => e.id !== id));
      setTotal((prev) => prev - 1);
      toast.success("Enrollment deleted");
    } catch {
      toast.error("Failed to delete enrollment");
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" });
  };

  const formatTime = (d: string) => {
    const date = new Date(d);
    return date.toLocaleTimeString("en-BD", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Enrollments</h1>
        <p className="text-muted-foreground mt-1">Manage student enrollments and payments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: "Total", value: total, icon: Users, color: "text-primary" },
          { label: "Pending", value: enrollments.filter((e) => e.status === "pending").length, icon: Clock, color: "text-warning" },
          { label: "Approved", value: enrollments.filter((e) => e.status === "approved").length, icon: CheckCircle2, color: "text-success" },
          { label: "Rejected", value: enrollments.filter((e) => e.status === "rejected").length, icon: XCircle, color: "text-destructive" },
        ].map((s) => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4 shadow-sm-custom">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search by name, mobile, or course..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {["all", "pending", "approved", "rejected"].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                statusFilter === s
                  ? "bg-primary text-white"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "all" ? "All" : statusLabels[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : enrollments.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center shadow-sm-custom">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No enrollments found</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border shadow-sm-custom overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Course</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Batch</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Payment</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((en) => (
                  <tr key={en.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground">{en.full_name}</p>
                        <p className="text-xs text-muted-foreground">{en.mobile}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground max-w-[200px] truncate">{en.course_name || `Course #${en.course_id}`}</td>
                    <td className="px-4 py-3 text-foreground max-w-[150px] truncate">{en.batch_name || <span className="text-muted-foreground italic">-</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {en.payment_method === "digital" ? (
                          <Smartphone className="w-3.5 h-3.5" />
                        ) : (
                          <CreditCard className="w-3.5 h-3.5" />
                        )}
                        <span className="capitalize">{en.payment_method}</span>
                        {en.mobile_banking && <span className="capitalize">({en.mobile_banking})</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">৳{en.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div>{formatDate(en.created_at)}</div>
                      <div className="text-xs">{formatTime(en.created_at)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[en.status] || ""}`}>
                        {statusLabels[en.status] || en.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDetailEnrollment(en)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {en.status === "pending" && (
                          <>
                            <button
                              onClick={() => updateStatus(en.id, "approved")}
                              disabled={updatingId === en.id}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-success hover:bg-success/10 transition-colors disabled:opacity-50"
                              title="Approve"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => updateStatus(en.id, "rejected")}
                              disabled={updatingId === en.id}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(en.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {detailEnrollment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-lg-custom">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Enrollment Details</h2>
              <button
                onClick={() => setDetailEnrollment(null)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Student Name</label>
                  <p className="font-medium text-foreground flex items-center gap-1.5"><User className="w-4 h-4" /> {detailEnrollment.full_name}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Mobile</label>
                  <p className="font-medium text-foreground flex items-center gap-1.5"><Phone className="w-4 h-4" /> {detailEnrollment.mobile}</p>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Course</label>
                <p className="font-medium text-foreground">{detailEnrollment.course_name || `Course #${detailEnrollment.course_id}`}</p>
              </div>
              {detailEnrollment.batch_name && (
                <div>
                  <label className="text-xs text-muted-foreground">Batch</label>
                  <p className="font-medium text-foreground">{detailEnrollment.batch_name}</p>
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground">Enrolled By</label>
                <p className="font-medium text-foreground capitalize">{detailEnrollment.enrolled_by || "self"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Payment Method</label>
                  <p className="font-medium text-foreground capitalize">{detailEnrollment.payment_method}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Amount</label>
                  <p className="font-bold text-primary text-lg">৳{detailEnrollment.amount.toLocaleString()}</p>
                </div>
              </div>
              {detailEnrollment.payment_method === "manual" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Mobile Banking</label>
                    <p className="font-medium text-foreground capitalize">{detailEnrollment.mobile_banking || "-"}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Sent From</label>
                    <p className="font-medium text-foreground">{detailEnrollment.sent_from || "-"}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Sent To</label>
                    <p className="font-medium text-foreground">{detailEnrollment.sent_to || "-"}</p>
                  </div>
                </div>
              )}
              {detailEnrollment.referral_source && (
                <div>
                  <label className="text-xs text-muted-foreground">Referral Source</label>
                  <p className="font-medium text-foreground">{detailEnrollment.referral_source}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Submitted</label>
                  <p className="text-sm text-foreground">{formatDate(detailEnrollment.created_at)} {formatTime(detailEnrollment.created_at)}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Status</label>
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[detailEnrollment.status]}`}>
                    {statusLabels[detailEnrollment.status]}
                  </span>
                </div>
              </div>
            </div>
            {detailEnrollment.status === "pending" && (
              <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
                <button
                  onClick={() => { updateStatus(detailEnrollment.id, "rejected"); setDetailEnrollment(null); }}
                  className="px-4 py-2.5 rounded-xl border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={() => { updateStatus(detailEnrollment.id, "approved"); setDetailEnrollment(null); }}
                  className="px-4 py-2.5 rounded-xl bg-success text-white text-sm font-semibold hover:bg-success/90 transition-colors"
                >
                  Approve
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
