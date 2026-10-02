"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getToken } from "@/lib/auth";
import { omrApi, batchApi, type OMRExam, type OMRQuestion, type OMRStudent, type Batch } from "@/lib/api";
import { Copy, Loader2, Printer, Save, Users } from "lucide-react";
import { toast } from "sonner";
import { solaimanLipi } from "../../_lib/fonts";

const OPTION_LABELS = ["ক", "খ", "গ", "ঘ"];
const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
const toBanglaNumber = (n: number) =>
  String(n)
    .split("")
    .map((d) => BN_DIGITS[Number(d)] ?? d)
    .join("");

export default function OmrTokenDetailPage() {
  const params = useParams();
  const examId = Number(params.id);
  const token = getToken() || "";

  const [exam, setExam] = useState<OMRExam | null>(null);
  const [students, setStudents] = useState<OMRStudent[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(false);
  const [columnView, setColumnView] = useState<"auto" | "2" | "3" | "4">("auto");

  const [batches, setBatches] = useState<Batch[]>([]);
  const [importBatchId, setImportBatchId] = useState<number | "">("");
  const [importBusy, setImportBusy] = useState(false);
  const [rollInput, setRollInput] = useState("");
  const [addingRoster, setAddingRoster] = useState(false);

  const fetchExam = useCallback(async () => {
    setLoading(true);
    try {
      const detail = await omrApi.getExam(token, examId);
      setExam(detail.exam);
      setStudents(detail.students);
      const byNumber = new Map<number, OMRQuestion>(detail.questions.map((q) => [q.question_number, q]));
      setAnswers(
        Array.from({ length: detail.exam.question_count }, (_, i) => byNumber.get(i + 1)?.correct_option ?? 0)
      );
    } catch {
      toast.error("Failed to load token");
    } finally {
      setLoading(false);
    }
  }, [token, examId]);

  useEffect(() => {
    fetchExam();
  }, [fetchExam]);

  useEffect(() => {
    batchApi.getBatches(token).then(setBatches).catch(() => setBatches([]));
  }, [token]);

  const handleCopyCode = () => {
    if (!exam) return;
    navigator.clipboard?.writeText(exam.exam_code).then(
      () => toast.success("Token copied"),
      () => toast.error("Could not copy token")
    );
  };

  const handleSaveAnswerKey = async () => {
    if (answers.some((a) => a === 0)) {
      toast.error("Set the correct answer for every question");
      return;
    }
    setSavingKey(true);
    try {
      await omrApi.updateAnswerKey(
        token,
        examId,
        answers.map((correct_option, i) => ({ question_number: i + 1, correct_option }))
      );
      toast.success("Answer key saved");
      fetchExam();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save answer key");
    } finally {
      setSavingKey(false);
    }
  };

  const handleImportRoster = async () => {
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
      setImportBatchId("");
      fetchExam();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to import roster");
    } finally {
      setImportBusy(false);
    }
  };

  const handleAddRoster = async () => {
    const rolls = rollInput
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [roll, ...nameParts] = line.split(",");
        return { roll_number: roll.trim(), name: nameParts.join(",").trim() };
      });
    if (rolls.length === 0) {
      toast.error("Paste at least one roll number");
      return;
    }
    setAddingRoster(true);
    try {
      const result = await omrApi.addStudents(token, examId, rolls);
      toast.success(`Added ${result.added} students`);
      setRollInput("");
      fetchExam();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add roster");
    } finally {
      setAddingRoster(false);
    }
  };

  const inputClass =
    "w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  if (loading || !exam) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{exam.title}</h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-3">
            <button onClick={handleCopyCode} className="inline-flex items-center gap-1.5 font-mono hover:text-foreground" title="Copy OMR token">
              {exam.exam_code} <Copy className="w-3 h-3" />
            </button>
            <span>{exam.question_count} questions · {exam.class_level || "—"} · {exam.subject || "—"}</span>
          </p>
        </div>
        <Link
          href={`/admin/omr/create/print/${exam.id}`}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-semibold hover:bg-secondary/70"
        >
          <Printer className="w-4 h-4" /> Print
        </Link>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">Answer Key</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-xl bg-secondary p-1">
              {(["auto", "2", "3", "4"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setColumnView(opt)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    columnView === opt ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt === "auto" ? "Auto" : opt}
                </button>
              ))}
            </div>
            <button
              onClick={handleSaveAnswerKey}
              disabled={savingKey}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white text-xs font-semibold shadow-primary disabled:opacity-60"
            >
              {savingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Answer Key
            </button>
          </div>
        </div>
        {(() => {
          const activeColumns = columnView === "auto" ? exam.columns : Number(columnView);
          const rowsPerColumn = Math.ceil(exam.question_count / activeColumns);
          return (
            <div
              className={`grid gap-4 max-h-[32rem] overflow-x-auto overflow-y-auto p-3 rounded-xl bg-secondary/40 ${solaimanLipi.className}`}
              style={{ gridAutoFlow: "column", gridTemplateColumns: `repeat(${activeColumns}, minmax(190px, 1fr))` }}
            >
              {Array.from({ length: activeColumns }, (_, colIdx) => {
                const start = colIdx * rowsPerColumn;
                const colAnswers = answers.slice(start, start + rowsPerColumn);
                return (
                  <table key={colIdx} className="border-collapse text-xs bg-white w-full">
                    <thead>
                      <tr>
                        <th className="border-2 border-black px-2 py-1.5 font-semibold text-black bg-white">প্রশ্ন</th>
                        <th
                          className="border-2 border-black px-2 py-1.5 font-semibold text-black bg-white"
                          colSpan={OPTION_LABELS.length}
                        >
                          উত্তর
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {colAnswers.map((selected, rowIdx) => {
                        const i = start + rowIdx;
                        return (
                          <tr key={i}>
                            <td className="border-2 border-black px-2 py-1 text-center font-medium text-black">{toBanglaNumber(i + 1)}</td>
                            {OPTION_LABELS.map((label, optIdx) => (
                              <td key={label} className={`border-2 border-black p-1 text-center ${optIdx % 2 === 0 ? "bg-rose-50" : "bg-white"}`}>
                                <button
                                  onClick={() =>
                                    setAnswers((prev) => {
                                      const next = [...prev];
                                      next[i] = optIdx + 1;
                                      return next;
                                    })
                                  }
                                  className={`w-6 h-6 mx-auto rounded-full border-2 border-black text-xs font-semibold flex items-center justify-center transition-colors ${
                                    selected === optIdx + 1 ? "bg-green-600 border-green-600 text-white" : "bg-white text-black hover:bg-rose-100"
                                  }`}
                                >
                                  {label}
                                </button>
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })}
            </div>
          );
        })()}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Roster</h2>
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><Users className="w-4 h-4" />{students.length} students</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Import from a batch</label>
          <div className="flex items-center gap-2">
            <select className={`${inputClass} max-w-xs`} value={importBatchId} onChange={(e) => setImportBatchId(e.target.value ? Number(e.target.value) : "")}>
              <option value="">Pick a batch…</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleImportRoster}
              disabled={importBusy}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold disabled:opacity-60"
            >
              {importBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Import roster
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Adds/updates roll numbers from this batch&apos;s approved enrollments.</p>
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
          <div className="flex justify-end mt-2">
            <button
              onClick={handleAddRoster}
              disabled={addingRoster}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-foreground text-xs font-semibold disabled:opacity-60"
            >
              {addingRoster && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Add roster
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
