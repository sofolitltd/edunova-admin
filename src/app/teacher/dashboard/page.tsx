"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getStoredTeacher, getTeacherToken } from "@/lib/auth";
import { teacherApi, type TeacherBatch } from "@/lib/api";
import { UserCheck, BookMarked, Lightbulb, FileText, Award, HelpCircle, Layers, Users, Loader2 } from "lucide-react";

const quickLinks = [
  { href: "/teacher/attendance", label: "Attendance", description: "Mark and review attendance", icon: UserCheck, color: "from-primary to-primary-dark" },
  { href: "/teacher/lessons", label: "Lessons", description: "Manage daily lessons", icon: BookMarked, color: "from-success to-emerald-600" },
  { href: "/teacher/daily-content", label: "Daily Content", description: "Post daily learning content", icon: Lightbulb, color: "from-accent to-pink-500" },
  { href: "/teacher/exams", label: "Exams", description: "Create and manage exams", icon: FileText, color: "from-warning to-amber-600" },
  { href: "/teacher/results", label: "Results", description: "Enter and review results", icon: Award, color: "from-primary to-primary-dark" },
  { href: "/teacher/doubts", label: "Doubts", description: "Respond to student doubts", icon: HelpCircle, color: "from-success to-emerald-600" },
];

export default function TeacherDashboardPage() {
  const teacher = getStoredTeacher();
  const [batches, setBatches] = useState<TeacherBatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getTeacherToken();
    if (!token) return;
    teacherApi.getMyBatches(token)
      .then(setBatches)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back{teacher?.full_name ? `, ${teacher.full_name}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">Here&apos;s what you can manage today</p>
      </div>

      {/* Assigned Batches */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Layers className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">My Batches</h3>
            <p className="text-xs text-muted-foreground">Batches assigned to you</p>
          </div>
        </div>

        {loading ? (
          <div className="py-10 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading...
          </div>
        ) : batches.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            No batches assigned to you yet. Contact an admin to get assigned.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {batches.map((b) => (
              <div key={b.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{b.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.class_level}{b.shift ? ` · ${b.shift}` : ""}{b.code ? ` · ${b.code}` : ""}
                    {b.schedule ? ` · ${b.schedule}` : ""}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-muted-foreground text-xs font-medium shrink-0">
                  <Users className="w-3 h-3" />
                  {b.student_count} students
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-card rounded-2xl border border-border p-5 hover:border-primary/40 hover:shadow-sm transition-all group"
          >
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4`}>
              <item.icon className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{item.label}</h3>
            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
