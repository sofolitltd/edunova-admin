"use client";

import { useCallback, useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { omrApi, type OMRDesign, type OMRTemplate } from "@/lib/api";
import { OmrSheet } from "../_lib/OmrSheet";
import { ScanLine, Plus, Printer, Loader2, CheckCircle2, XCircle, Ticket, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
  const previewExam = { id: 0, title, class_level: classLevel, subject, question_count: template.question_bubbles.length, columns: template.columns, exam_code: "", omr_design_id: null, answer_key_set: false, student_count: 0, sheet_count: 0, created_at: "", updated_at: "" };
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

  const [designs, setDesigns] = useState<OMRDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [subject, setSubject] = useState("");
  const [questionCount, setQuestionCount] = useState(50);
  const [columns, setColumns] = useState(0); // 0 = auto
  const [saving, setSaving] = useState(false);
  const [scanCheck, setScanCheck] = useState<{ scannable: boolean; reason: string; columns: number } | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<OMRTemplate | null>(null);

  const fetchDesigns = useCallback(async () => {
    setLoading(true);
    try {
      setDesigns(await omrApi.listDesigns(token));
    } catch {
      toast.error("Failed to load OMR list");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDesigns();
  }, [fetchDesigns]);

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
    setEditingId(null);
  };

  const openCreateForm = () => {
    if (showForm && editingId === null) {
      setShowForm(false);
      return;
    }
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (d: OMRDesign) => {
    setEditingId(d.id);
    setTitle(d.title);
    setClassLevel(d.class_level);
    setSubject(d.subject);
    setQuestionCount(d.question_count);
    setColumns(d.columns);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        class_level: classLevel,
        subject,
        columns: columns || undefined,
        question_count: questionCount,
      };
      if (editingId !== null) {
        await omrApi.updateDesign(token, editingId, payload);
        toast.success("OMR updated");
      } else {
        await omrApi.createDesign(token, payload);
        toast.success("OMR created");
      }
      resetForm();
      setShowForm(false);
      fetchDesigns();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save OMR");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (d: OMRDesign) => {
    if (!window.confirm(`Delete "${d.title}"? Tokens already created from it keep their own data.`)) return;
    setDeletingId(d.id);
    try {
      await omrApi.deleteDesign(token, d.id);
      toast.success("OMR deleted");
      fetchDesigns();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete OMR");
    } finally {
      setDeletingId(null);
    }
  };

  const inputClass =
    "w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  // Mirrors LivePreview's own inline exam stand-in — no design is saved yet
  // at this point in the flow, so there's nothing real to render the sheet
  // with beyond the current form values.
  const previewExamForPrint = previewTemplate
    ? {
        id: 0,
        title,
        class_level: classLevel,
        subject,
        question_count: previewTemplate.question_bubbles.length,
        columns: previewTemplate.columns,
        exam_code: "",
        omr_design_id: null,
        answer_key_set: false,
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
          <h1 className="text-2xl font-bold text-foreground">OMR Create</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Design a bubble-sheet layout — title, class, subject and question count. Tokens are created from this on the OMR Token page.
          </p>
        </div>
        <button
          onClick={openCreateForm}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-semibold shadow-primary hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Create OMR
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
              <label className="block text-sm font-medium text-foreground mb-1.5">Title *</label>
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

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-semibold shadow-primary disabled:opacity-60"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId !== null ? "Update OMR" : "Save OMR"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : designs.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <ScanLine className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">No OMR yet</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">Create one to generate tokens from on the OMR Token page.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Class</th>
                <th className="text-left px-4 py-3">Subject</th>
                <th className="text-left px-4 py-3">Questions</th>
                <th className="text-left px-4 py-3">Columns</th>
                <th className="text-left px-4 py-3">Tokens</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {designs.map((d) => (
                <tr key={d.id} className="hover:bg-secondary/30">
                  <td className="px-4 py-3 text-foreground font-medium">{d.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.class_level || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.subject || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.question_count}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.columns}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Ticket className="w-3.5 h-3.5" /> {d.token_count}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditForm(d)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-foreground hover:bg-secondary/70"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(d)}
                        disabled={deletingId === d.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-60"
                      >
                        {deletingId === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete
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
      </div>
    </div>
  );
}
