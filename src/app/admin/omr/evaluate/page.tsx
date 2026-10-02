"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { omrApi, type OMRExam } from "@/lib/api";
import { CheckSquare, Ticket, Users, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function EvaluateOmrPage() {
  const token = getToken() || "";
  const router = useRouter();

  const [exams, setExams] = useState<OMRExam[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">OMR Evaluate</h1>
        <p className="text-sm text-muted-foreground mt-1">Pick a token to upload and evaluate its sheets, or review what&apos;s already scored.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <CheckSquare className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">No tokens yet</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">Create one on the OMR Token page before evaluating sheets.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Token</th>
                <th className="text-left px-4 py-3">Students</th>
                <th className="text-left px-4 py-3">Sheets Evaluated</th>
                <th className="text-left px-4 py-3">Answer Key</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {exams.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => router.push(`/admin/omr/evaluate/${e.id}`)}
                  className="hover:bg-secondary/30 cursor-pointer"
                >
                  <td className="px-4 py-3 text-foreground font-medium">{e.title}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5"><Ticket className="w-3.5 h-3.5" />{e.exam_code}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" />{e.student_count}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{e.sheet_count}</td>
                  <td className="px-4 py-3">
                    {e.answer_key_set ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-600"><CheckCircle2 className="w-4 h-4" /> Set</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-amber-600"><AlertCircle className="w-4 h-4" /> Not set</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
