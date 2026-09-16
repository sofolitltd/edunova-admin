"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUserToken, getStoredUser, isUserAuthenticated } from "@/lib/auth";
import { api, type Enrollment } from "@/lib/api";
import { BookOpen, Clock, CheckCircle, FileText, GraduationCap, ArrowRight, HelpCircle, Calendar, BookMarked, Newspaper } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: number; full_name: string; mobile: string } | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [stats, setStats] = useState({
    total_enrollments: 0,
    pending_enrollments: 0,
    approved_enrollments: 0,
    total_exams: 0,
    completed_exams: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isUserAuthenticated()) {
      router.push("/login");
      return;
    }
    const storedUser = getStoredUser();
    if (storedUser) setUser(storedUser);

    const token = getUserToken();
    if (!token) return;

    Promise.all([
      api.getUserDashboard(token),
      api.getUserEnrollments(token),
    ]).then(([dash, enroll]) => {
      setStats(dash);
      setEnrollments(enroll);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [router]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-success/10 text-success";
      case "rejected": return "bg-destructive/10 text-destructive";
      default: return "bg-warning/10 text-warning";
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch { return dateStr; }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {user?.full_name?.split(" ")[0] || "Student"}!
        </h1>
        <p className="text-muted-foreground mt-1">Here&apos;s your learning overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.total_enrollments}</div>
          <div className="text-sm text-muted-foreground">Total Enrollments</div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center mb-3">
            <CheckCircle className="w-5 h-5 text-success" />
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.approved_enrollments}</div>
          <div className="text-sm text-muted-foreground">Approved</div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-warning" />
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.pending_enrollments}</div>
          <div className="text-sm text-muted-foreground">Pending</div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
            <FileText className="w-5 h-5 text-accent" />
          </div>
          <div className="text-2xl font-bold text-foreground">{stats.completed_exams}</div>
          <div className="text-sm text-muted-foreground">Exams Taken</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Link href="/dashboard/doubts" className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-all group">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3">
            <HelpCircle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-sm font-semibold text-foreground">Ask a Doubt</div>
          <div className="text-xs text-muted-foreground mt-0.5">Get help from teachers</div>
        </Link>
        <Link href="/dashboard/calendar" className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-all group">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
            <Calendar className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-sm font-semibold text-foreground">Calendar</div>
          <div className="text-xs text-muted-foreground mt-0.5">Upcoming exams & events</div>
        </Link>
        <Link href="/dashboard/lessons" className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-all group">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3">
            <BookMarked className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-sm font-semibold text-foreground">Today&apos;s Lessons</div>
          <div className="text-xs text-muted-foreground mt-0.5">What was taught today</div>
        </Link>
        <Link href="/dashboard/articles" className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-all group">
          <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center mb-3">
            <Newspaper className="w-5 h-5 text-pink-500" />
          </div>
          <div className="text-sm font-semibold text-foreground">Parenting Hub</div>
          <div className="text-xs text-muted-foreground mt-0.5">Tips & wellness articles</div>
        </Link>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">My Enrollments</h2>
          <Link href="/courses" className="text-sm text-primary font-medium hover:underline">
            Browse More
          </Link>
        </div>
        {enrollments.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No enrollments yet</p>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark transition-all"
            >
              Browse Courses
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {enrollments.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-6 py-4 hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{e.course_name || "Course"}</div>
                    <div className="text-xs text-muted-foreground">
                      Enrolled {formatDate(e.created_at)} · {e.payment_method}
                    </div>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(e.status)}`}>
                  {e.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
