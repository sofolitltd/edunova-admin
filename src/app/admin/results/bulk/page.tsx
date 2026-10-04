"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { getToken, isAuthenticated, getLoginPath } from "@/lib/auth";
import { attendanceApi, resultApi, type User } from "@/lib/api";
import { SUBJECTS } from "@/lib/resultSubjects";
import { useBatchFilter } from "@/hooks/useBatchFilter";
import { BatchFilterSelect } from "@/components/BatchFilterSelect";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

type Entry = { marks: string; absent: boolean };

export default function BulkResultsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { isTeacherPortal, batches, selectedBatchId, setSelectedBatchId, batchIdNum } = useBatchFilter();
  const [students, setStudents] = useState<User[]>([]);
  const [entries, setEntries] = useState<Record<number, Entry>>({});
  const [loadedFor, setLoadedFor] = useState<number>();
  const [saving, setSaving] = useState(false);
  const [subject, setSubject] = useState("Math");
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState(new Date().toISOString().slice(0, 10));
  const [marksTotal, setMarksTotal] = useState(20);
  const searchParams = useSearchParams();
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const presetBatch = searchParams.get("batch");
  useEffect(() => {
    if (presetBatch) setSelectedBatchId(presetBatch);
  }, [presetBatch, setSelectedBatchId]);

  useEffect(() => {
    if (!isAuthenticated()) { router.push(getLoginPath(pathname)); return; }
    const token = getToken();
    if (!token || !batchIdNum) return;
    attendanceApi.getStudents(token, batchIdNum)
      .then((data) => { setStudents(data); setEntries({}); })
      .catch(() => toast.error("Failed to load students"))
      .finally(() => setLoadedFor(batchIdNum));
  }, [router, pathname, batchIdNum]);

  const setEntry = (id: number, patch: Partial<Entry>) =>
    setEntries((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { marks: "", absent: false }), ...patch } }));

  const loading = !!batchIdNum && loadedFor !== batchIdNum;
  const filled = students.filter((s) => entries[s.id]?.marks !== undefined && entries[s.id]?.marks !== "" && !entries[s.id]?.absent);
  const absentCount = students.filter((s) => entries[s.id]?.absent).length;

  const handleSave = async () => {
    const token = getToken();
    if (!token) return;
    if (!examName.trim()) { toast.error("Exam name is required"); return; }
    if (filled.some((s) => Number(entries[s.id].marks) > marksTotal)) { toast.error("Marks cannot exceed total marks"); return; }
    if (filled.length + absentCount === 0) { toast.error("Enter marks or mark absent for at least one student"); return; }
    setSaving(true);
    try {
      const res = await resultApi.bulkCreateResults(token, {
        subject,
        exam_name: examName.trim(),
        exam_date: examDate,
        marks_total: marksTotal,
        rows: students.flatMap((s) => {
          const e = entries[s.id];
          if (e?.absent) return [{ user_id: s.id, marks_obtained: 0, absent: true }];
          if (e && e.marks !== "") return [{ user_id: s.id, marks_obtained: Number(e.marks) }];
          return [];
        }),
      });
      toast.success(`${res.saved} results saved`);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to save"); }
    finally { setSaving(false); }
  };

  const inputClass = "w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="space-y-6">
      <div>
        <Link href={`${isTeacherPortal ? "/teacher" : "/admin"}/results`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Results
        </Link>
        <h1 className="text-2xl font-bold text-foreground mt-2">Bulk Result Entry</h1>
        <p className="text-sm text-muted-foreground mt-1">Enter one exam&apos;s marks for the whole batch. Absent students are shown to guardians as absent and excluded from averages.</p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="flex items-center">
          <BatchFilterSelect batches={batches} value={selectedBatchId} onChange={setSelectedBatchId} isTeacherPortal={isTeacherPortal} />
        </div>
        <select value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass}>
          {SUBJECTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <input value={examName} onChange={(e) => setExamName(e.target.value)} placeholder="Exam name (e.g. CT-12)" className={inputClass} />
        <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className={inputClass} />
        <input type="number" min={1} value={marksTotal} onChange={(e) => setMarksTotal(Number(e.target.value))} placeholder="Total marks" className={inputClass} />
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {!batchIdNum ? (
          <div className="text-center py-12 text-muted-foreground">Select a batch to load its students</div>
        ) : loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : students.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No students in this batch</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="px-4 py-3 w-12">#</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3 w-40">Marks / {marksTotal}</th>
                <th className="px-4 py-3 w-24">Absent</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => {
                const e = entries[s.id];
                return (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-2 font-medium">{s.full_name}</td>
                    <td className="px-4 py-2">
                      <input
                        ref={(el) => { inputs.current[i] = el; }}
                        type="number"
                        min={0}
                        max={marksTotal}
                        step="0.5"
                        disabled={e?.absent}
                        value={e?.marks ?? ""}
                        onChange={(ev) => setEntry(s.id, { marks: ev.target.value })}
                        onKeyDown={(ev) => { if (ev.key === "Enter") { ev.preventDefault(); inputs.current[i + 1]?.focus(); } }}
                        className={`${inputClass} ${Number(e?.marks) > marksTotal ? "ring-2 ring-destructive/50" : ""}`}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input type="checkbox" checked={e?.absent ?? false} onChange={(ev) => setEntry(s.id, { absent: ev.target.checked, marks: "" })} className="w-4 h-4" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {batchIdNum && students.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-muted-foreground">{filled.length} entered · {absentCount} absent · {students.length - filled.length - absentCount} blank</p>
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark transition-all disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Results
          </button>
        </div>
      )}
    </div>
  );
}
