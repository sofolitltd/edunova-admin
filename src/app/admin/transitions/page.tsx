"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, isAuthenticated } from "@/lib/auth";
import { transitionApi, type StudentTransition } from "@/lib/api";
import { GraduationCap, Trophy, TrendingUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function TransitionsPage() {
  const router = useRouter();
  const [transitions, setTransitions] = useState<StudentTransition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/admin/login"); return; }
    loadTransitions();
  }, [router]);

  const loadTransitions = async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const data = await transitionApi.getTransitions(token);
      setTransitions(data);
    } catch { toast.error("Failed to load transitions"); }
    finally { setLoading(false); }
  };

  const getGpaColor = (gpa: number) => {
    if (gpa >= 5.0) return "text-success";
    if (gpa >= 3.5) return "text-primary";
    if (gpa >= 2.0) return "text-warning";
    return "text-destructive";
  };

  const getGpaBg = (gpa: number) => {
    if (gpa >= 5.0) return "bg-success/10";
    if (gpa >= 3.5) return "bg-primary/10";
    if (gpa >= 2.0) return "bg-warning/10";
    return "bg-destructive/10";
  };

  const getGpaIcon = (gpa: number) => {
    if (gpa >= 5.0) return <Trophy className="w-5 h-5 text-success" />;
    if (gpa >= 3.5) return <TrendingUp className="w-5 h-5 text-primary" />;
    if (gpa >= 2.0) return <AlertTriangle className="w-5 h-5 text-warning" />;
    return <AlertTriangle className="w-5 h-5 text-destructive" />;
  };

  const highPerformers = transitions.filter(t => t.gpa >= 5.0).length;
  const goodPerformers = transitions.filter(t => t.gpa >= 3.5 && t.gpa < 5.0).length;
  const needsImprovement = transitions.filter(t => t.gpa >= 2.0 && t.gpa < 3.5).length;
  const struggling = transitions.filter(t => t.gpa < 2.0).length;

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
    catch { return d; }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Year-End Transitions</h1>
        <p className="text-sm text-muted-foreground mt-1">Student class transitions and automated feedback</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center mb-2"><Trophy className="w-4 h-4 text-success" /></div>
          <div className="text-lg font-bold text-foreground">{highPerformers}</div>
          <div className="text-xs text-muted-foreground">High Performers (GPA 5.0)</div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-2"><TrendingUp className="w-4 h-4 text-primary" /></div>
          <div className="text-lg font-bold text-foreground">{goodPerformers}</div>
          <div className="text-xs text-muted-foreground">Good (GPA 3.5-4.9)</div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="w-9 h-9 rounded-xl bg-warning/10 flex items-center justify-center mb-2"><AlertTriangle className="w-4 h-4 text-warning" /></div>
          <div className="text-lg font-bold text-foreground">{needsImprovement}</div>
          <div className="text-xs text-muted-foreground">Needs Improvement</div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center mb-2"><AlertTriangle className="w-4 h-4 text-destructive" /></div>
          <div className="text-lg font-bold text-foreground">{struggling}</div>
          <div className="text-xs text-muted-foreground">Struggling (GPA &lt; 2.0)</div>
        </div>
      </div>

      {/* Transitions List */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">All Transitions ({transitions.length})</h2>
        </div>
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading...</div>
        ) : transitions.length === 0 ? (
          <div className="py-12 text-center">
            <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No transitions submitted yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {transitions.map(t => (
              <div key={t.id} className="px-6 py-4 hover:bg-secondary/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-xl ${getGpaBg(t.gpa)} flex items-center justify-center flex-shrink-0`}>
                      {getGpaIcon(t.gpa)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{t.user_name || `User #${t.user_id}`}</h3>
                        <span className={`text-sm font-bold ${getGpaColor(t.gpa)}`}>GPA {t.gpa.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>Class {t.from_class} → Class {t.to_class}</span>
                        <span>·</span>
                        <span>{formatDate(t.submitted_at)}</span>
                      </div>
                      {t.result_notes && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.result_notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
