"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api, examsApi, type Exam, type CreateExamPayload } from "@/lib/api";
import { getToken, getLoginPath } from "@/lib/auth";
import { useBatchFilter } from "@/hooks/useBatchFilter";
import { BatchFilterSelect } from "@/components/BatchFilterSelect";
import {
  Plus,
  Pencil,
  Trash2,
  FileText,
  X,
  Loader2,
  Radio,
  ListChecks,
} from "lucide-react";
import { toast } from "sonner";

const defaultExamForm = {
  title: "",
  batch_id: 0,
  date: "",
  time: "",
  duration: "",
  total_marks: 0,
};

export default function ExamsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const portalBase = pathname.startsWith("/teacher") ? "/teacher" : "/admin";
  const { isTeacherPortal, batches, selectedBatchId, setSelectedBatchId, batchIdNum } = useBatchFilter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [examForm, setExamForm] = useState(defaultExamForm);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.push(getLoginPath(pathname));
      return;
    }
    try {
      const examsData = await api.getExams(token, batchIdNum);
      setExams(examsData);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [router, pathname, batchIdNum]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setEditingId(null);
    setExamForm({ ...defaultExamForm, batch_id: isTeacherPortal && batches.length === 1 ? batches[0].id : 0 });
    setShowModal(true);
  };

  const toggleLive = async (exam: Exam) => {
    const token = getToken();
    if (!token) return;
    try {
      const newState = !exam.is_live;
      await examsApi.toggleLive(token, exam.id, newState);
      toast.success(newState ? "Exam is now LIVE" : "Exam stopped");
      fetchData();
    } catch {
      toast.error("Failed to toggle live");
    }
  };

  const openEdit = (exam: Exam) => {
    setEditingId(exam.id);
    setExamForm({
      title: exam.title,
      batch_id: exam.batch_id || 0,
      date: exam.date,
      time: exam.time,
      duration: exam.duration,
      total_marks: exam.total_marks || 0,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!examForm.title || !examForm.batch_id || !examForm.date || !examForm.time || !examForm.duration) {
      toast.error("All exam fields are required, including batch");
      return;
    }
    const selectedBatch = batches.find((b) => b.id === examForm.batch_id);
    if (!selectedBatch) {
      toast.error("Please select a valid batch");
      return;
    }
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      const payload: CreateExamPayload = {
        ...examForm,
        course_id: selectedBatch.course_id,
        total_marks: Number(examForm.total_marks) || 0,
      };
      if (editingId) {
        const updated = await api.updateExam(token, editingId, payload);
        setExams((prev) => prev.map((e) => (e.id === editingId ? updated : e)));
        toast.success("Exam updated");
        setShowModal(false);
      } else {
        const created = await api.createExam(token, payload);
        toast.success("Exam created — now add questions");
        setShowModal(false);
        router.push(`${portalBase}/exams/${created.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save exam");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Delete exam "${title}"? This cannot be undone.`)) return;
    const token = getToken();
    if (!token) return;
    try {
      await api.deleteExam(token, id);
      setExams((prev) => prev.filter((e) => e.id !== id));
      toast.success("Exam deleted");
    } catch {
      toast.error("Failed to delete exam");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-3 sm:block">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Exams</h1>
            <p className="text-muted-foreground mt-1">Manage exams and questions</p>
          </div>
          <button
            onClick={openCreate}
            className="sm:hidden inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold text-sm shadow-primary hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Exam
          </button>
        </div>
        <div className="flex items-center gap-3">
          <BatchFilterSelect batches={batches} value={selectedBatchId} onChange={setSelectedBatchId} isTeacherPortal={isTeacherPortal} />
          <button
            onClick={openCreate}
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold text-sm shadow-primary hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Exam
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center shadow-sm-custom">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No exams yet. Create your first exam.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="bg-card rounded-2xl border border-border shadow-sm-custom overflow-hidden"
            >
              <div className="flex items-center justify-between p-5">
                <button
                  onClick={() => router.push(`${portalBase}/exams/${exam.id}`)}
                  className="flex items-center gap-4 text-left flex-1 min-w-0"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{exam.title}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {exam.course_name} · {exam.date} · {exam.time} · {exam.duration}
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-medium text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
                    {exam.total_questions} Q · {exam.total_marks} marks
                  </span>
                  {exam.is_live && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-bold animate-pulse">
                      <Radio className="w-3 h-3" /> LIVE
                    </span>
                  )}
                  <button
                    onClick={() => toggleLive(exam)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      exam.is_live
                        ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                        : "bg-success/10 text-success hover:bg-success/20"
                    }`}
                  >
                    {exam.is_live ? "Stop Live" : "Go Live"}
                  </button>
                  <button
                    onClick={() => router.push(`${portalBase}/exams/${exam.id}`)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Manage questions"
                  >
                    <ListChecks className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEdit(exam)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Edit exam info"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(exam.id, exam.title)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Delete exam"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / edit exam info modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-lg-custom max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
              <h2 className="text-lg font-semibold text-foreground">
                {editingId ? "Edit Exam" : "Create Exam"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Batch *
                </label>
                <select
                  value={examForm.batch_id}
                  onChange={(e) => setExamForm({ ...examForm, batch_id: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value={0}>Select batch</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>{b.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Title *
                </label>
                <input
                  value={examForm.title}
                  onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g. Mid-term Exam"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={examForm.date}
                    onChange={(e) => setExamForm({ ...examForm, date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Time *
                  </label>
                  <input
                    type="time"
                    value={examForm.time}
                    onChange={(e) => setExamForm({ ...examForm, time: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Duration *
                  </label>
                  <input
                    value={examForm.duration}
                    onChange={(e) => setExamForm({ ...examForm, duration: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g. 60 min"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Marks
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={examForm.total_marks}
                    onChange={(e) => setExamForm({ ...examForm, total_marks: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g. 100"
                  />
                </div>
              </div>
              {!editingId && (
                <p className="text-xs text-muted-foreground">
                  You&apos;ll add questions (manually or from the question bank) on the next screen.
                </p>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-border shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-semibold shadow-primary hover:shadow-lg disabled:opacity-50 flex items-center gap-2 transition-all"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId ? "Update" : "Create Exam"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
