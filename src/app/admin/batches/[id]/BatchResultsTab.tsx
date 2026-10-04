"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getToken } from "@/lib/auth";
import { resultApi, type Result } from "@/lib/api";
import { SUBJECTS } from "@/lib/resultSubjects";
import { ListChecks } from "lucide-react";
import { toast } from "sonner";

const percentColor = (p: number) => (p >= 70 ? "text-success" : p >= 50 ? "text-warning" : "text-destructive");
const subjectLabel = (value: string) => SUBJECTS.find((s) => s.value === value)?.label || value;

export function BatchResultsTab({ batchId }: { batchId: number }) {
  const [results, setResults] = useState<Result[] | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    resultApi.getResults(token, undefined, batchId)
      .then(setResults)
      .catch(() => { toast.error("Failed to load results"); setResults([]); });
  }, [batchId]);

  const { exams, students } = useMemo(() => {
    const byExam = new Map<string, { key: string; subject: string; exam: string; date: string; scores: number[]; absent: number }>();
    const byStudent = new Map<number, { name: string; scores: number[]; absent: number }>();
    for (const r of results ?? []) {
      const ek = `${r.subject}|${r.exam_name}|${r.exam_date}`;
      const e = byExam.get(ek) ?? { key: ek, subject: r.subject, exam: r.exam_name, date: r.exam_date, scores: [], absent: 0 };
      const s = byStudent.get(r.user_id) ?? { name: r.student_name, scores: [], absent: 0 };
      if (r.absent) { e.absent++; s.absent++; } else { e.scores.push(r.percentage); s.scores.push(r.percentage); }
      byExam.set(ek, e);
      byStudent.set(r.user_id, s);
    }
    const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
    return {
      exams: [...byExam.values()].map((e) => ({ ...e, avg: avg(e.scores) })),
      students: [...byStudent.values()].map((s) => ({ ...s, avg: avg(s.scores) })).sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1)),
    };
  }, [results]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-muted-foreground">Offline exam scores for this batch, as guardians see them</p>
        <Link href={`/admin/results/bulk?batch=${batchId}`} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark transition-all">
          <ListChecks className="w-4 h-4" /> Enter Results
        </Link>
      </div>

      {results === null ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : results.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center text-muted-foreground">No results recorded for this batch yet</div>
      ) : (
        <>
          <div className="bg-card rounded-2xl border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Exam</th>
                  <th className="text-left px-4 py-3 font-medium">Subject</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-right px-4 py-3 font-medium">Appeared</th>
                  <th className="text-right px-4 py-3 font-medium">Absent</th>
                  <th className="text-right px-4 py-3 font-medium">Class Avg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {exams.map((e) => (
                  <tr key={e.key}>
                    <td className="px-4 py-3 font-medium">{e.exam}</td>
                    <td className="px-4 py-3">{subjectLabel(e.subject)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.date}</td>
                    <td className="px-4 py-3 text-right">{e.scores.length}</td>
                    <td className="px-4 py-3 text-right">{e.absent}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${e.avg === null ? "text-muted-foreground" : percentColor(e.avg)}`}>{e.avg === null ? "—" : `${e.avg.toFixed(1)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3 font-medium w-12">#</th>
                  <th className="text-left px-4 py-3 font-medium">Student</th>
                  <th className="text-right px-4 py-3 font-medium">Exams</th>
                  <th className="text-right px-4 py-3 font-medium">Absent</th>
                  <th className="text-right px-4 py-3 font-medium">Average</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((s, i) => (
                  <tr key={s.name + i}>
                    <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-right">{s.scores.length}</td>
                    <td className="px-4 py-3 text-right">{s.absent}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${s.avg === null ? "text-muted-foreground" : percentColor(s.avg)}`}>{s.avg === null ? "—" : `${s.avg.toFixed(1)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
