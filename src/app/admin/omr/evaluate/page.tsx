"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { getToken } from "@/lib/auth";
import { omrApi, type OMRSheet } from "@/lib/api";
import { CheckSquare, Upload, Camera, Loader2, CheckCircle2, AlertTriangle, Pencil, Link2, Link2Off } from "lucide-react";
import { toast } from "sonner";

const OPTION_LABELS = ["", "A", "B", "C", "D"];

export default function EvaluateOmrPage() {
  const token = getToken() || "";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<OMRSheet[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [activeExamId, setActiveExamId] = useState<number | null>(null);

  const [editingSheetId, setEditingSheetId] = useState<number | null>(null);
  const [editAnswers, setEditAnswers] = useState<Record<number, number>>({});
  const [savingCorrection, setSavingCorrection] = useState(false);

  // Once a sheet has told us which exam it belongs to, reload the full
  // persisted history for that exam so scored sheets survive a page reload
  // instead of only living in this tab's memory.
  const loadHistory = useCallback(
    async (examId: number) => {
      try {
        setResults(await omrApi.listSheets(token, examId));
      } catch {
        // keep whatever's already in state — history is a convenience, not critical
      }
    },
    [token]
  );

  useEffect(() => {
    if (activeExamId != null) loadHistory(activeExamId);
  }, [activeExamId, loadHistory]);

  const handleFile = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const sheet = await omrApi.uploadSheet(token, file, activeExamId ?? undefined);
        if (sheet.status === "needs_review") {
          toast.warning("Sheet scored, but flagged for review — some marks were unclear");
        } else {
          toast.success(`Scored ${sheet.score}/${sheet.total_questions}`);
        }
        if (sheet.omr_exam_id !== activeExamId) {
          setActiveExamId(sheet.omr_exam_id);
        } else {
          loadHistory(sheet.omr_exam_id);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to evaluate sheet");
      } finally {
        setUploading(false);
      }
    },
    [token, activeExamId, loadHistory]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const startEditing = (sheet: OMRSheet) => {
    setEditingSheetId(sheet.id);
    const initial: Record<number, number> = {};
    for (const q of sheet.questions ?? []) {
      if (q.ambiguous) initial[q.question_number] = q.selected_option || 0;
    }
    setEditAnswers(initial);
  };

  const saveCorrections = async (sheet: OMRSheet) => {
    const corrections = Object.entries(editAnswers)
      .filter(([, option]) => option > 0)
      .map(([questionNumber, corrected_option]) => ({ question_number: Number(questionNumber), corrected_option }));
    if (corrections.length === 0) {
      toast.error("Pick a corrected answer for at least one flagged question");
      return;
    }
    setSavingCorrection(true);
    try {
      await omrApi.updateSheet(token, sheet.omr_exam_id, sheet.id, { corrections });
      toast.success("Corrections saved");
      setEditingSheetId(null);
      loadHistory(sheet.omr_exam_id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save corrections");
    } finally {
      setSavingCorrection(false);
    }
  };

  const flaggedQuestions = (sheet: OMRSheet) => (sheet.questions ?? []).filter((q) => q.ambiguous);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Evaluate OMR</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a photo of a filled bubble sheet — the sheet&apos;s printed exam code identifies which exam it belongs to automatically.
        </p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`bg-card border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center transition-all ${
          dragOver ? "border-primary bg-primary/5" : "border-border"
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
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
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
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          {uploading ? <Loader2 className="w-7 h-7 text-primary animate-spin" /> : <Upload className="w-7 h-7 text-primary" />}
        </div>
        <h2 className="text-lg font-semibold text-foreground">{uploading ? "Scoring..." : "Drop a sheet photo here"}</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm mb-5">JPEG or PNG — photograph the full sheet with all 4 corners visible and well lit.</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-secondary/70 disabled:opacity-60"
          >
            <Upload className="w-4 h-4" /> Choose file
          </button>
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-semibold shadow-primary disabled:opacity-60"
          >
            <Camera className="w-4 h-4" /> Use camera
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="mt-6 bg-card border border-border rounded-2xl overflow-hidden">
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
              {results.map((r) => (
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
                      {flaggedQuestions(r).length > 0 && (
                        <button
                          onClick={() => (editingSheetId === r.id ? setEditingSheetId(null) : startEditing(r))}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-700 hover:bg-amber-500/20"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Fix {flaggedQuestions(r).length} answer{flaggedQuestions(r).length > 1 ? "s" : ""}
                        </button>
                      )}
                    </td>
                  </tr>
                  {editingSheetId === r.id && (
                    <tr className="bg-amber-500/5">
                      <td colSpan={6} className="px-4 py-4">
                        <p className="text-xs text-muted-foreground mb-3">
                          These bubbles couldn&apos;t be read confidently. Pick what was actually marked on the sheet.
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {flaggedQuestions(r).map((q) => (
                            <div key={q.question_number} className="flex items-center gap-1.5 bg-card rounded-lg px-2 py-1.5 border border-border">
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
      )}

      {results.length === 0 && (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <CheckSquare className="w-4 h-4" /> Scored sheets will appear here.
        </div>
      )}
    </div>
  );
}
