"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { omrApi, type OMRSheet, type OMRExam } from "@/lib/api";
import {
  ArrowLeft,
  Upload,
  Camera,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Pencil,
  Trash2,
  Link2,
  Link2Off,
  X,
  Plus,
  CheckSquare,
  Clock,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { pdfToImageFiles } from "../../_lib/pdfToImages";

const OPTION_LABELS = ["", "A", "B", "C", "D"];

interface QueueItem {
  id: string;
  file: File;
  previewUrl: string;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
  result?: OMRSheet;
  elapsedMs?: number;
}

function sheetStats(sheet: OMRSheet) {
  const qs = sheet.questions ?? [];
  const ambiguous = qs.filter((q) => q.ambiguous).length;
  return {
    marked: qs.length - ambiguous,
    ambiguous,
    correct: qs.filter((q) => q.correct).length,
    incorrect: qs.filter((q) => !q.correct && !q.ambiguous).length,
  };
}

export default function EvaluateTokenDetailPage() {
  const params = useParams();
  const examId = Number(params.id);
  const token = getToken() || "";
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [exam, setExam] = useState<OMRExam | null>(null);
  const [sheets, setSheets] = useState<OMRSheet[]>([]);
  const [loading, setLoading] = useState(true);

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [convertingPdf, setConvertingPdf] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [editingSheetId, setEditingSheetId] = useState<number | null>(null);
  const [editAnswers, setEditAnswers] = useState<Record<number, number>>({});
  const [savingCorrection, setSavingCorrection] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [zoomImage, setZoomImage] = useState<{ src: string; label: string } | null>(null);
  const [zoomScale, setZoomScale] = useState(1);

  useEffect(() => {
    if (!zoomImage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomImage(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomImage]);

  useEffect(() => {
    omrApi
      .listExams(token)
      .then((exams) => setExam(exams.find((e) => e.id === examId) ?? null))
      .catch(() => setExam(null));
  }, [token, examId]);

  const fetchSheets = useCallback(async () => {
    setLoading(true);
    try {
      setSheets(await omrApi.listSheets(token, examId));
    } catch {
      toast.error("Failed to load evaluated sheets");
    } finally {
      setLoading(false);
    }
  }, [token, examId]);

  useEffect(() => {
    fetchSheets();
  }, [fetchSheets]);

  const addFiles = (files: FileList | File[]): QueueItem[] => {
    const items: QueueItem[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: "pending",
      progress: 0,
    }));
    if (items.length === 0) return [];
    setQueue((prev) => [...prev, ...items]);
    setActivePreviewId(items[0].id);
    return items;
  };

  const handlePdfSelected = async (file: File) => {
    setConvertingPdf(true);
    try {
      const pages = await pdfToImageFiles(file, file.name.replace(/\.pdf$/i, ""));
      if (pages.length === 0) {
        toast.error("Could not read any pages from that PDF");
        return;
      }
      toast.success(`${pages.length} page${pages.length > 1 ? "s" : ""} added from PDF — click Evaluate to score.`);
      addFiles(pages);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to read that PDF");
    } finally {
      setConvertingPdf(false);
    }
  };

  const removeQueueItem = (id: string) => {
    setQueue((prev) => {
      const item = prev.find((q) => q.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((q) => q.id !== id);
    });
    setActivePreviewId((prev) => (prev === id ? null : prev));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const evaluateQueue = async () => {
    const pending = queue.filter((q) => q.status === "pending" || q.status === "error");
    if (pending.length === 0) return;
    setEvaluating(true);

    for (const item of pending) {
      setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: "uploading", error: undefined, progress: 0 } : q)));
      setActivePreviewId(item.id);
      const startedAt = Date.now();
      try {
        const sheet = await omrApi.uploadSheetWithProgress(token, item.file, examId, (pct) => {
          setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, progress: pct } : q)));
        });
        const elapsedMs = Date.now() - startedAt;
        if (sheet.status === "needs_review") {
          toast.warning(`${item.file.name}: scored but flagged for review — some marks were unclear`);
        } else {
          toast.success(`${item.file.name}: scored ${sheet.score}/${sheet.total_questions}`);
        }
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: "done", progress: 100, result: sheet, elapsedMs } : q))
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to evaluate sheet";
        toast.error(`${item.file.name}: ${message}`);
        setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: "error", error: message } : q)));
      }
    }

    setEvaluating(false);
    fetchSheets();
  };

  const startEditing = (sheet: OMRSheet) => {
    setEditingSheetId(sheet.id);
    const initial: Record<number, number> = {};
    for (const q of sheet.questions ?? []) {
      initial[q.question_number] = q.selected_option || 0;
    }
    setEditAnswers(initial);
  };

  const saveCorrections = async (sheet: OMRSheet) => {
    const corrections = Object.entries(editAnswers)
      .filter(([, option]) => option > 0)
      .map(([questionNumber, corrected_option]) => ({ question_number: Number(questionNumber), corrected_option }));
    if (corrections.length === 0) {
      toast.error("Pick an answer for at least one question");
      return;
    }
    setSavingCorrection(true);
    try {
      await omrApi.updateSheet(token, examId, sheet.id, { corrections });
      toast.success("Corrections saved");
      setEditingSheetId(null);
      fetchSheets();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save corrections");
    } finally {
      setSavingCorrection(false);
    }
  };

  const deleteSheet = async (sheet: OMRSheet) => {
    if (!window.confirm(`Delete this sheet (roll ${sheet.detected_roll_number || "unknown"})? This also removes its gradebook entry, if any.`)) return;
    setDeletingId(sheet.id);
    try {
      await omrApi.deleteSheet(token, examId, sheet.id);
      toast.success("Sheet deleted");
      setSheets((prev) => prev.filter((s) => s.id !== sheet.id));
      if (editingSheetId === sheet.id) setEditingSheetId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete sheet");
    } finally {
      setDeletingId(null);
    }
  };

  const flaggedQuestions = (sheet: OMRSheet) => (sheet.questions ?? []).filter((q) => q.ambiguous);
  const activeItem = queue.find((q) => q.id === activePreviewId) ?? null;
  const pendingCount = queue.filter((q) => q.status === "pending" || q.status === "error").length;
  const activeStats = activeItem?.result ? sheetStats(activeItem.result) : null;

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => router.push("/admin/omr/evaluate")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Back to tokens
        </button>
        <h1 className="text-2xl font-bold text-foreground">{exam ? exam.title : "Evaluate"}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {exam ? (
            <>
              Token <span className="font-mono">{exam.exam_code}</span> — add sheet photos below, then evaluate.
            </>
          ) : (
            "Add sheet photos below, then evaluate."
          )}
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`relative flex items-center justify-center bg-secondary/20 h-[440px] transition-all ${
            dragOver ? "ring-2 ring-inset ring-primary" : ""
          }`}
        >
          {/* No `capture` attribute — on mobile this opens the gallery/file
              chooser (which can still include a camera option depending on
              the OS), and it's what drag-and-drop from a desktop file
              manager targets. */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          {/* `capture="environment"` forces mobile browsers to open the rear
              camera directly instead of a gallery/chooser dialog. */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/jpeg,image/png"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          {/* A multi-page scan (e.g. a CamScanner PDF of several sheets) —
              rendered to one JPEG per page in the browser, then queued like a
              normal photo upload. Evaluation still requires the Evaluate
              button, same as any other upload. */}
          <input
            ref={pdfInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePdfSelected(file);
              e.target.value = "";
            }}
          />

          {activeItem ? (
            <>
              {activeItem.status === "done" && activeItem.result?.annotated_preview ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full h-full p-3">
                  <div className="flex flex-col h-full min-h-0">
                    <p className="text-xs text-muted-foreground text-center mb-1">Original</p>
                    <button
                      type="button"
                      onClick={() => {
                        setZoomImage({ src: activeItem.previewUrl, label: "Original" });
                        setZoomScale(1);
                      }}
                      className="group relative flex-1 min-h-0 border border-border rounded-lg overflow-hidden bg-background cursor-zoom-in"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={activeItem.previewUrl} alt="Original sheet" className="w-full h-full object-contain" />
                      <span className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ZoomIn className="w-3.5 h-3.5" />
                      </span>
                    </button>
                  </div>
                  <div className="flex flex-col h-full min-h-0">
                    <p className="text-xs text-muted-foreground text-center mb-1">Evaluated</p>
                    <button
                      type="button"
                      onClick={() => {
                        setZoomImage({ src: activeItem.result!.annotated_preview!, label: "Evaluated" });
                        setZoomScale(1);
                      }}
                      className="group relative flex-1 min-h-0 border border-border rounded-lg overflow-hidden bg-background cursor-zoom-in"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={activeItem.result.annotated_preview}
                        alt="Evaluated sheet"
                        className="w-full h-full object-contain"
                      />
                      <span className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ZoomIn className="w-3.5 h-3.5" />
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full p-3">
                  <button
                    type="button"
                    onClick={() => {
                      setZoomImage({ src: activeItem.previewUrl, label: "Sheet preview" });
                      setZoomScale(1);
                    }}
                    className="group relative w-full h-full border border-border rounded-lg overflow-hidden bg-background cursor-zoom-in"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={activeItem.previewUrl} alt="Sheet preview" className="w-full h-full object-contain" />
                    <span className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ZoomIn className="w-3.5 h-3.5" />
                    </span>
                  </button>
                </div>
              )}
              {activeItem.status === "error" && (
                <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 rounded-lg bg-red-600/90 text-white text-xs px-3 py-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {activeItem.error}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center text-center py-16 px-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Upload className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">Drop sheet photos here</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                JPEG or PNG — photograph the full sheet with all 4 corners visible and well lit. Or upload a
                multi-page PDF scan, then click Evaluate to score every page.
              </p>
            </div>
          )}
        </div>

        {activeItem?.status === "uploading" && (
          <div className="flex items-center gap-3 px-5 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Evaluating…</span>
            <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${activeItem.progress}%` }} />
            </div>
            <span className="text-xs text-muted-foreground w-10 text-right">{activeItem.progress}%</span>
          </div>
        )}

        {activeItem?.status === "done" && activeStats && (
          <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-t border-border">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-500/10 text-sky-700">
              Marked: {activeStats.marked}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700">
              Ambiguous: {activeStats.ambiguous}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700">
              Correct: {activeStats.correct}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-700">
              Incorrect: {activeStats.incorrect}
            </span>
            {activeItem.elapsedMs != null && (
              <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" /> Evaluated in {(activeItem.elapsedMs / 1000).toFixed(1)}s
              </span>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-t border-border">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-secondary/70"
            >
              <Upload className="w-4 h-4" /> Choose file
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-secondary/70"
            >
              <Camera className="w-4 h-4" /> Use camera
            </button>
            <button
              type="button"
              onClick={() => pdfInputRef.current?.click()}
              disabled={convertingPdf}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-secondary/70 disabled:opacity-50"
            >
              {convertingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {convertingPdf ? "Reading PDF…" : "Upload PDF"}
            </button>
          </div>

          <button
            type="button"
            onClick={() => evaluateQueue()}
            disabled={pendingCount === 0 || evaluating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-semibold shadow-primary disabled:opacity-50 sm:ml-auto"
          >
            {evaluating && <Loader2 className="w-4 h-4 animate-spin" />}
            Evaluate{pendingCount > 0 ? ` (${pendingCount})` : ""}
          </button>
        </div>

        {queue.length > 0 && (
          <div className="flex gap-3 px-5 pb-5 overflow-x-auto">
            {queue.map((item) => (
              <div
                key={item.id}
                onClick={() => setActivePreviewId(item.id)}
                className={`relative shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 cursor-pointer ${
                  activePreviewId === item.id ? "border-primary" : "border-border"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
                {item.status === "uploading" && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                )}
                {item.status === "done" && (
                  <div className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                )}
                {item.status === "error" && (
                  <div className="absolute inset-0 bg-red-600/60 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeQueueItem(item.id);
                  }}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50"
            >
              <Plus className="w-5 h-5" />
              <span className="text-[10px] mt-1">Add OMR</span>
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : sheets.length === 0 ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <CheckSquare className="w-4 h-4" /> Scored sheets will appear here.
        </div>
      ) : (
        <div className="mt-6 bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Roll</th>
                <th className="text-left px-4 py-3">Student</th>
                <th className="text-left px-4 py-3">Score</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Gradebook</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sheets.map((r) => (
                <Fragment key={r.id}>
                  <tr className="hover:bg-secondary/30">
                    <td className="px-4 py-3 font-mono text-foreground">{r.detected_roll_number || "—"}</td>
                    <td className="px-4 py-3 text-foreground">{r.matched_student_name || <span className="text-muted-foreground">unmatched</span>}</td>
                    <td className="px-4 py-3 text-foreground font-medium">
                      {r.score} / {r.total_questions}
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "scored" ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="w-4 h-4" /> Scored</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-amber-600"><AlertTriangle className="w-4 h-4" /> Needs review</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.gradebook_synced ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-600" title="Posted to the student's Results">
                          <Link2 className="w-4 h-4" /> Synced
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground" title="No linked app account for this student">
                          <Link2Off className="w-4 h-4" /> Not linked
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => (editingSheetId === r.id ? setEditingSheetId(null) : startEditing(r))}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                            flaggedQuestions(r).length > 0
                              ? "bg-amber-500/10 text-amber-700 hover:bg-amber-500/20"
                              : "bg-secondary text-foreground hover:bg-secondary/70"
                          }`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          {flaggedQuestions(r).length > 0
                            ? `Fix ${flaggedQuestions(r).length} answer${flaggedQuestions(r).length > 1 ? "s" : ""}`
                            : "Edit"}
                        </button>
                        <button
                          onClick={() => deleteSheet(r)}
                          disabled={deletingId === r.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-60"
                        >
                          {deletingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingSheetId === r.id && (
                    <tr className="bg-amber-500/5">
                      <td colSpan={6} className="px-4 py-4">
                        <p className="text-xs text-muted-foreground mb-3">
                          Amber questions couldn&apos;t be read confidently — pick what was actually marked, or change any other answer below.
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {(r.questions ?? []).map((q) => (
                            <div
                              key={q.question_number}
                              className={`flex items-center gap-1.5 bg-card rounded-lg px-2 py-1.5 border ${
                                q.ambiguous ? "border-amber-400" : "border-border"
                              }`}
                            >
                              <span className="text-xs text-muted-foreground w-6">{q.question_number}.</span>
                              {[1, 2, 3, 4].map((opt) => (
                                <button
                                  key={opt}
                                  onClick={() => setEditAnswers((prev) => ({ ...prev, [q.question_number]: opt }))}
                                  className={`w-6 h-6 rounded-full text-xs font-semibold transition-all ${
                                    editAnswers[q.question_number] === opt ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  {OPTION_LABELS[opt]}
                                </button>
                              ))}
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end gap-2 mt-3">
                          <button onClick={() => setEditingSheetId(null)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary">
                            Cancel
                          </button>
                          <button
                            onClick={() => saveCorrections(r)}
                            disabled={savingCorrection}
                            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold disabled:opacity-60"
                          >
                            {savingCorrection && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Save corrections
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {zoomImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          onClick={() => setZoomImage(null)}
        >
          <div className="flex items-center justify-between px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
            <span className="text-sm font-medium">{zoomImage.label}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomScale((s) => Math.max(1, s - 0.5))}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs w-10 text-center">{Math.round(zoomScale * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoomScale((s) => Math.min(4, s + 0.5))}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomScale(1)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                title="Reset zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomImage(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div
            className="flex-1 overflow-auto flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => {
              e.preventDefault();
              setZoomScale((s) => Math.min(4, Math.max(1, s + (e.deltaY < 0 ? 0.25 : -0.25))));
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomImage.src}
              alt={zoomImage.label}
              className="select-none transition-transform"
              style={{ transform: `scale(${zoomScale})`, maxWidth: "100%", maxHeight: "100%" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
