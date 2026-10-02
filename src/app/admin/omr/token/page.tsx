"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { omrApi, type OMRExam, type OMRDesign } from "@/lib/api";
import { Ticket, Users, Plus, Loader2, Copy, CheckCircle2, AlertCircle, X, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function OmrTokenPage() {
  const token = getToken() || "";
  const router = useRouter();

  const [exams, setExams] = useState<OMRExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [designs, setDesigns] = useState<OMRDesign[]>([]);

  const [showDialog, setShowDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesignId, setNewDesignId] = useState<number | "">("");
  const [creating, setCreating] = useState(false);
  const [editingExam, setEditingExam] = useState<OMRExam | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      setExams(await omrApi.listExams(token));
    } catch {
      toast.error("Failed to load OMR tokens");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  useEffect(() => {
    omrApi.listDesigns(token).then(setDesigns).catch(() => setDesigns([]));
  }, [token]);

  const handleCopyCode = (code: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard?.writeText(code).then(
      () => toast.success("Token copied"),
      () => toast.error("Could not copy token")
    );
  };

  const openDialog = () => {
    setEditingExam(null);
    setNewTitle("");
    setNewDesignId(designs[0]?.id ?? "");
    setShowDialog(true);
  };

  const openEditDialog = (e: OMRExam, ev: React.MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    setEditingExam(e);
    setNewTitle(e.title);
    setShowDialog(true);
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    setCreating(true);
    try {
      if (editingExam) {
        await omrApi.updateToken(token, editingExam.id, newTitle.trim());
        toast.success("Token updated");
      } else {
        if (!newDesignId) {
          toast.error("Choose an OMR");
          setCreating(false);
          return;
        }
        const exam = await omrApi.createToken(token, { title: newTitle.trim(), omr_design_id: Number(newDesignId) });
        toast.success(`Token created — code ${exam.exam_code}`);
      }
      setShowDialog(false);
      setEditingExam(null);
      fetchExams();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save token");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e: OMRExam, ev: React.MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (!window.confirm(`Delete "${e.title}"? This also removes its answer key, roster, and scanned sheets.`)) return;
    setDeletingId(e.id);
    try {
      await omrApi.deleteToken(token, e.id);
      toast.success("Token deleted");
      fetchExams();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete token");
    } finally {
      setDeletingId(null);
    }
  };

  const inputClass =
    "w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">OMR Token</h1>
          <p className="text-sm text-muted-foreground mt-1">Create a token from an OMR, then set its answer key and roster on its details page.</p>
        </div>
        <button
          onClick={openDialog}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-semibold shadow-primary hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          New Token
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Ticket className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">No tokens yet</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">Create one from an existing OMR.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Token</th>
                <th className="text-left px-4 py-3">Total Marks</th>
                <th className="text-left px-4 py-3">Students</th>
                <th className="text-left px-4 py-3">Answer Key</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {exams.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => router.push(`/admin/omr/token/${e.id}`)}
                  className="hover:bg-secondary/30 cursor-pointer"
                >
                  <td className="px-4 py-3 text-foreground font-medium">{e.title}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(ev) => handleCopyCode(e.exam_code, ev)}
                      className="inline-flex items-center gap-1.5 font-mono text-muted-foreground hover:text-foreground"
                      title="Copy OMR token"
                    >
                      {e.exam_code} <Copy className="w-3 h-3" />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{e.question_count}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" />{e.student_count}</span>
                  </td>
                  <td className="px-4 py-3">
                    {e.answer_key_set ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="w-4 h-4" /> Set</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-amber-600"><AlertCircle className="w-4 h-4" /> Not set</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={(ev) => openEditDialog(e, ev)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-foreground hover:bg-secondary/70"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={(ev) => handleDelete(e, ev)}
                        disabled={deletingId === e.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-60"
                      >
                        {deletingId === e.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {showDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => {
            setShowDialog(false);
            setEditingExam(null);
          }}
        >
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{editingExam ? "Rename Token" : "New Token"}</h2>
              <button
                onClick={() => {
                  setShowDialog(false);
                  setEditingExam(null);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Title *</label>
              <input className={inputClass} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Set A" autoFocus />
            </div>

            {!editingExam && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Choose OMR *</label>
                {designs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No OMR created yet — create one on the OMR Create page first.</p>
                ) : (
                  <select className={inputClass} value={newDesignId} onChange={(e) => setNewDesignId(e.target.value ? Number(e.target.value) : "")}>
                    {designs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title} ({d.question_count}q)
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowDialog(false);
                  setEditingExam(null);
                }}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || (!editingExam && designs.length === 0)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-semibold shadow-primary disabled:opacity-60"
              >
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingExam ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
