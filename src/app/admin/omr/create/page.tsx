"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getToken } from "@/lib/auth";
import { omrApi, batchApi, type OMRExam, type OMRTemplate, type Batch } from "@/lib/api";
import { OmrSheet } from "../_lib/OmrSheet";
import { ScanLine, Plus, Printer, Users, UserPlus, Loader2, CheckCircle2, XCircle, Upload, Copy } from "lucide-react";
import { toast } from "sonner";

const OPTION_LABELS = ["A", "B", "C", "D"];

/** The sheet is shown at its true A4 size and scrolled when it doesn't fit.
 * It is deliberately not scaled down: the grid lines are a fraction of a
 * millimetre wide, so any transform: scale() shrinks them below one device
 * pixel and the browser drops them at random, which makes a correct sheet
 * look like a broken table. */
function LivePreview({ title, classLevel, subject, template }: { title: string; classLevel: string; subject: string; template: OMRTemplate | null }) {
  if (!template) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Building preview...
      </div>
    );
  }
  const previewExam = { id: 0, title, class_level: classLevel, subject, question_count: template.question_bubbles.length, columns: template.columns, exam_code: "", student_count: 0, sheet_count: 0, created_at: "", updated_at: "" };
  return (
    <div className="w-full overflow-auto">
      <div style={{ width: `${template.page_width_mm}mm`, boxShadow: "0 1px 8px rgba(0,0,0,0.12)" }}>
        <OmrSheet exam={previewExam} template={template} />
      </div>
    </div>
  );
}

export default function CreateOmrPage() {
  const token = getToken() || "";

  const [exams, setExams] = useState<OMRExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [subject, setSubject] = useState("");
  const [questionCount, setQuestionCount] = useState(50);
  const [columns, setColumns] = useState(0); // 0 = auto
  const [answers, setAnswers] = useState<number[]>(Array(50).fill(0));
  const [rollInput, setRollInput] = useState("");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [createBatchId, setCreateBatchId] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [scanCheck, setScanCheck] = useState<{ scannable: boolean; reason: string; columns: number } | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<OMRTemplate | null>(null);

  // Inline "import roster from batch" control for an already-created exam,
  // toggled per row rather than a modal — matches this page's existing
  // "toggle a panel open" convention (see `showForm`).
  const [importingExamId, setImportingExamId] = useState<number | null>(null);
  const [importBatchId, setImportBatchId] = useState<number | "">("");
  const [importBusy, setImportBusy] = useState(false);

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      setExams(await omrApi.listExams(token));
    } catch {
      toast.error("Failed to load OMR exams");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  useEffect(() => {
    batchApi.getBatches(token).then(setBatches).catch(() => setBatches([]));
  }, [token]);

  useEffect(() => {
    setAnswers((prev) => {
      const next = Array(questionCount).fill(0);
      for (let i = 0; i < Math.min(prev.length, questionCount); i++) next[i] = prev[i];
      return next;
    });
  }, [questionCount]);

  useEffect(() => {
    if (!showForm) return;
    const t = setTimeout(async () => {
      try {
        const [check, preview] = await Promise.all([
          omrApi.checkScannable(token, questionCount, columns),
          omrApi.previewTemplate(token, questionCount, columns),
        ]);
        setScanCheck(check);
        setPreviewTemplate(preview.template);
      } catch {
        setScanCheck(null);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [showForm, questionCount, columns, token]);

  const resetForm = () => {
    setTitle("");
    setClassLevel("");
    setSubject("");
    setQuestionCount(50);
    setColumns(0);
    setAnswers(Array(50).fill(0));
    setRollInput("");
    setCreateBatchId("");
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (answers.some((a) => a === 0)) {
      toast.error("Set the correct answer for every question");
      return;
    }
    setSaving(true);
    try {
      const exam = await omrApi.createExam(token, {
        title: title.trim(),
        class_level: classLevel,
        subject,
        columns: columns || undefined,
        questions: answers.map((correct_option, i) => ({ question_number: i + 1, correct_option })),
      });

      const rolls = rollInput
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [roll, ...nameParts] = line.split(",");
          return { roll_number: roll.trim(), name: nameParts.join(",").trim() };
        });
      if (rolls.length > 0) {
        await omrApi.addStudents(
          token,
          exam.id,
          rolls.map((r) => ({ roll_number: r.roll_number, name: r.name }))
        );
      }

      if (createBatchId) {
        const result = await omrApi.importRoster(token, exam.id, Number(createBatchId));
        toast.success(
          `Imported ${result.imported} students from batch` +
            (result.without_login > 0 ? ` (${result.without_login} have no app login yet — their results won't sync automatically)` : "")
        );
      }

      toast.success(`OMR exam created — code ${exam.exam_code}`);
      resetForm();
      setShowForm(false);
      fetchExams();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create exam");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code).then(
      () => toast.success("Exam code copied"),
      () => toast.error("Could not copy code")
    );
  };

  const handleImportRoster = async (examId: number) => {
    if (!importBatchId) {
      toast.error("Pick a batch first");
      return;
    }
    setImportBusy(true);
    try {
      const result = await omrApi.importRoster(token, examId, Number(importBatchId));
      toast.success(
        `Imported ${result.imported} students` +
          (result.without_login > 0 ? ` (${result.without_login} have no app login yet)` : "")
      );
      setImportingExamId(null);
      setImportBatchId("");
      fetchExams();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import roster");
    } finally {
      setImportBusy(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  // Mirrors LivePreview's own inline exam stand-in — no exam is saved yet at
  // this point in the flow, so there's no real OMRExam (or examId to hand
  // off to the dedicated print page) to render the sheet with.
  const previewExamForPrint = previewTemplate
    ? {
        id: 0,
        title,
        class_level: classLevel,
        subject,
        question_count: previewTemplate.question_bubbles.length,
        columns: previewTemplate.columns,
        exam_code: "",
        student_count: 0,
        sheet_count: 0,
        created_at: "",
        updated_at: "",
      }
    : null;

  return (
    <div>
      {/* Everything below prints only from the dedicated #omr-print-target
          (a plain sibling, off-screen on screen but brought back into normal
          flow for print) — never by hiding this page's own content in place.
          An earlier version hid everything else with visibility:hidden,
          which keeps hidden elements in layout (just invisible), so this
          whole admin page's height still counted for pagination and printed
          a trailing blank page after the sheet. display:none on .no-print
          removes it from layout entirely, so there's nothing left to paginate
          past the one-page sheet.

          This page is also always rendered inside AdminLayout's `<aside>`
          sidebar + `<header>` topbar + `<main className="p-4 lg:p-8 ...">`
          shell (src/app/admin/layout.tsx) — none of that is part of this
          page's own JSX, so a .no-print class here can't reach it. It has to
          be hidden/reset by tag selector, same as the dedicated print page
          (create/print/[examId]/page.tsx) already does — otherwise the
          sidebar/topbar print alongside the sheet, and main's padding narrows
          the sheet's 210mm width enough to clip its right edge off the page. */}
      <style>{`
        @media print {
          /* Browsers drop background-color/background-image by default when
             printing unless told otherwise — but every structural line,
             corner marker, zebra stripe and filled bubble on the sheet is
             drawn as a filled div, not a border (see OmrSheet.tsx), so
             without this the printed sheet comes out looking blank/hollow
             even though the same page renders correctly on screen. */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          aside, header, .no-print { display: none !important; }
          /* AdminLayout nests two h-screen/overflow-hidden flex wrappers
             around <main> (plus main's own overflow-y-auto) to make the
             sidebar layout scroll independently on screen — printed at
             those same fixed viewport-height boxes, they'd clip the sheet
             to one screenful instead of letting it lay out across the page. */
          html, body, .h-screen { height: auto !important; }
          .overflow-hidden, .overflow-y-auto { overflow: visible !important; }
          main { padding: 0 !important; margin: 0 !important; }
          #omr-print-target {
            position: static !important;
            left: auto !important;
            width: 100%;
          }
          /* A trailing break after the *last* sheet would print one extra
             blank page — only break between sheets, and only when there's
             more than one (there's just the single live-preview sheet here,
             but this stays consistent with the dedicated print page's rule). */
          .omr-sheet:not(:last-child) { page-break-after: always; break-after: page; }
          @page { size: A4; margin: 0; }
        }
      `}</style>

      {/* Off-screen render target for the Print button — see the note above
          on why this is a plain sibling instead of reusing the on-screen
          LivePreview card (which sits inside .no-print, padded/bordered for
          the admin UI, not a bare printable page). */}
      <div id="omr-print-target" style={{ position: "fixed", left: "-9999px", top: 0 }}>
        {previewExamForPrint && previewTemplate && <OmrSheet exam={previewExamForPrint} template={previewTemplate} />}
      </div>

      <div className="no-print">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Create OMR</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build an answer key, add a roster, and print or download bubble sheets for a paper exam.
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-semibold shadow-primary hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          New OMR Exam
        </button>
      </div>

      {showForm && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 mb-6 items-start">
          {/* Left: live full-size preview of the sheet, matching the current
              settings — scrolls rather than shrinking on narrow screens. */}
          <div className="bg-card border border-border rounded-2xl p-6 min-h-[420px] overflow-hidden">
            <LivePreview title={title} classLevel={classLevel} subject={subject} template={previewTemplate} />
          </div>

          {/* Right: settings panel */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Exam Title *</label>
              <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Class 5 English 1st Term" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Class</label>
                <input className={inputClass} value={classLevel} onChange={(e) => setClassLevel(e.target.value)} placeholder="5" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Subject</label>
                <input className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="English" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Number of Questions</label>
              <input
                type="number"
                min={10}
                max={100}
                className={inputClass}
                value={questionCount}
                onChange={(e) => setQuestionCount(Math.max(1, Number(e.target.value) || 1))}
              />
              <p className="text-xs text-muted-foreground mt-1">Valid input 10 - 100</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Column</label>
              <div className="flex gap-2">
                {[0, 2, 3, 4].map((c) => (
                  <button
                    key={c}
                    onClick={() => setColumns(c)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      columns === c ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {c === 0 ? "Auto" : c}
                  </button>
                ))}
              </div>
            </div>

            {scanCheck && (
              <div className={`flex items-center gap-1.5 text-sm px-3 py-2.5 rounded-xl ${scanCheck.scannable ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"}`}>
                {scanCheck.scannable ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
                {scanCheck.scannable ? "This OMR is scannable." : scanCheck.reason}
              </div>
            )}

            {scanCheck?.scannable && (
              <button
                onClick={() => window.print()}
                disabled={!previewTemplate}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-semibold hover:bg-secondary/70 disabled:opacity-60"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            )}
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-card border border-border rounded-2xl p-6 mb-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Answer Key</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-80 overflow-y-auto p-3 rounded-xl bg-secondary/40">
              {answers.map((selected, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-card rounded-lg px-2 py-1.5 border border-border">
                  <span className="text-xs text-muted-foreground w-6">{i + 1}.</span>
                  {OPTION_LABELS.map((label, optIdx) => (
                    <button
                      key={label}
                      onClick={() =>
                        setAnswers((prev) => {
                          const next = [...prev];
                          next[i] = optIdx + 1;
                          return next;
                        })
                      }
                      className={`w-6 h-6 rounded-full text-xs font-semibold transition-all ${
                        selected === optIdx + 1 ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Import roster from a batch (optional)</label>
            <select
              className={inputClass}
              value={createBatchId}
              onChange={(e) => setCreateBatchId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">— No batch —</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Pulls roll numbers/names from this batch&apos;s approved enrollments and links each row to the enrolled student, so scored sheets can post to their results automatically.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Or paste a roster manually — one student per line: <span className="text-muted-foreground">roll, name</span>
            </label>
            <textarea
              className={`${inputClass} font-mono`}
              rows={5}
              value={rollInput}
              onChange={(e) => setRollInput(e.target.value)}
              placeholder={"1, Rahim Uddin\n2, Karim Ahmed"}
            />
            <p className="text-xs text-muted-foreground mt-1">Manually-added students won&apos;t link to an app account, so their results stay visible here only.</p>
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-all">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-semibold shadow-primary disabled:opacity-60"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Exam
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <ScanLine className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">No OMR exams yet</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">Create one to generate a printable bubble sheet.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Code</th>
                <th className="text-left px-4 py-3">Questions</th>
                <th className="text-left px-4 py-3">Students</th>
                <th className="text-left px-4 py-3">Sheets</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {exams.map((e) => (
                <Fragment key={e.id}>
                  <tr className="hover:bg-secondary/30">
                    <td className="px-4 py-3 text-foreground font-medium">{e.title}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleCopyCode(e.exam_code)}
                        className="inline-flex items-center gap-1.5 font-mono text-muted-foreground hover:text-foreground"
                        title="Copy OMR code"
                      >
                        {e.exam_code} <Copy className="w-3 h-3" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{e.question_count}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" />{e.student_count}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{e.sheet_count}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setImportingExamId(importingExamId === e.id ? null : e.id);
                            setImportBatchId("");
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-foreground hover:bg-secondary/70"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Roster
                        </button>
                        <Link
                          href={`/admin/omr/create/print/${e.id}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-foreground hover:bg-secondary/70"
                        >
                          <Printer className="w-3.5 h-3.5" /> Print
                        </Link>
                        <Link
                          href="/admin/omr/evaluate"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20"
                        >
                          <Upload className="w-3.5 h-3.5" /> Evaluate
                        </Link>
                      </div>
                    </td>
                  </tr>
                  {importingExamId === e.id && (
                    <tr className="bg-secondary/20">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <select
                            className={`${inputClass} max-w-xs`}
                            value={importBatchId}
                            onChange={(ev) => setImportBatchId(ev.target.value ? Number(ev.target.value) : "")}
                          >
                            <option value="">Pick a batch…</option>
                            {batches.map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleImportRoster(e.id)}
                            disabled={importBusy}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold disabled:opacity-60"
                          >
                            {importBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Import roster
                          </button>
                          <span className="text-xs text-muted-foreground">Adds/updates roll numbers from this batch&apos;s approved enrollments.</span>
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
      </div>
    </div>
  );
}
