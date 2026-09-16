"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getToken, isAuthenticated, getLoginPath } from "@/lib/auth";
import { doubtApi, type Doubt, type DoubtStats } from "@/lib/api";
import { useBatchFilter } from "@/hooks/useBatchFilter";
import { BatchFilterSelect } from "@/components/BatchFilterSelect";
import { HelpCircle, CheckCircle, XCircle, Clock, Loader2, X, Send } from "lucide-react";
import { toast } from "sonner";

type FilterStatus = "" | "pending" | "resolved" | "closed";

export default function DoubtsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { isTeacherPortal, batches, selectedBatchId, setSelectedBatchId, batchIdNum } = useBatchFilter();
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [stats, setStats] = useState<DoubtStats>({ total: 0, pending: 0, resolved: 0, closed: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("");
  const [resolving, setResolving] = useState<number | null>(null);
  const [resolutionText, setResolutionText] = useState("");
  const [saving, setSaving] = useState(false);

  const loadDoubts = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const [doubtsData, statsData] = await Promise.all([
        doubtApi.getDoubts(token, filter || undefined, undefined, batchIdNum),
        doubtApi.getStats(token),
      ]);
      setDoubts(doubtsData);
      setStats(statsData);
    } catch {
      toast.error("Failed to load doubts");
    } finally {
      setLoading(false);
    }
  }, [filter, batchIdNum]);

  useEffect(() => {
    if (!isAuthenticated()) { router.push(getLoginPath(pathname)); return; }
    loadDoubts();
  }, [loadDoubts, router, pathname]);

  const handleResolve = async (id: number) => {
    if (!resolutionText.trim()) { toast.error("Please enter a resolution"); return; }
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      await doubtApi.resolve(token, id, resolutionText.trim());
      toast.success("Doubt resolved");
      setResolving(null);
      setResolutionText("");
      loadDoubts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resolve doubt");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async (id: number) => {
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      await doubtApi.close(token, id);
      toast.success("Doubt closed");
      loadDoubts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to close doubt");
    } finally {
      setSaving(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "pending": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "resolved": return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "closed": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="w-3.5 h-3.5" />;
      case "resolved": return <CheckCircle className="w-3.5 h-3.5" />;
      case "closed": return <XCircle className="w-3.5 h-3.5" />;
      default: return <HelpCircle className="w-3.5 h-3.5" />;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const filters: { label: string; value: FilterStatus }[] = [
    { label: "All", value: "" },
    { label: "Pending", value: "pending" },
    { label: "Resolved", value: "resolved" },
    { label: "Closed", value: "closed" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Doubt Resolution</h1>
        <p className="text-sm text-muted-foreground mt-1">Track and resolve student doubts</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Resolved</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.resolved}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Closed</p>
          <p className="text-2xl font-bold text-muted-foreground">{stats.closed}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <BatchFilterSelect batches={batches} value={selectedBatchId} onChange={setSelectedBatchId} isTeacherPortal={isTeacherPortal} />
      </div>

      {/* Doubts List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-card border border-border rounded-2xl px-6 py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading doubts...
          </div>
        ) : doubts.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl px-6 py-12 text-center">
            <HelpCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No doubts found</p>
            <p className="text-xs text-muted-foreground mt-1">Student doubts will appear here</p>
          </div>
        ) : (
          doubts.map((doubt) => (
            <div key={doubt.id} className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {doubt.student_name?.[0]?.toUpperCase() || "S"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{doubt.student_name}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(doubt.created_at)}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${getStatusStyle(doubt.status)}`}>
                  {getStatusIcon(doubt.status)}
                  {doubt.status.charAt(0).toUpperCase() + doubt.status.slice(1)}
                </span>
              </div>

              <p className="text-sm text-foreground leading-relaxed">{doubt.question_text}</p>

              <div className="flex items-center gap-3 flex-wrap">
                {doubt.subject && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium">
                    {doubt.subject}
                  </span>
                )}
                {doubt.chapter && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-secondary text-muted-foreground text-xs font-medium">
                    {doubt.chapter}
                  </span>
                )}
              </div>

              {doubt.resolution && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3">
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">
                    Resolved by {doubt.resolved_by_name}
                  </p>
                  <p className="text-sm text-foreground">{doubt.resolution}</p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                {doubt.status === "pending" && (
                  <button
                    onClick={() => { setResolving(doubt.id); setResolutionText(""); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary-dark transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Resolve
                  </button>
                )}
                {doubt.status === "resolved" && (
                  <button
                    onClick={() => handleClose(doubt.id)}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary text-muted-foreground text-xs font-medium hover:text-foreground transition-all disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Close
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resolve Modal */}
      {resolving !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setResolving(null); setResolutionText(""); }}>
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Resolve Doubt</h3>
              <button onClick={() => { setResolving(null); setResolutionText(""); }} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Resolution</label>
                <textarea
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  placeholder="Write the resolution for this doubt..."
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button
                onClick={() => { setResolving(null); setResolutionText(""); }}
                className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResolve(resolving)}
                disabled={saving || !resolutionText.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <CheckCircle className="w-4 h-4" />
                Resolve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
