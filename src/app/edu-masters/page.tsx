"use client";

import Link from "next/link";
import Navbar from "@/components/navbar";
import {
  School,
  GraduationCap,
  Users,
  BookOpen,
  Award,
  ExternalLink,
} from "lucide-react";

const teachers = [
  {
    name: "Md Towfiqure Rehman",
    role: "Senior Instructor",
    university: "University of Chittagong (CU)",
    subjects: ["Mathematics", "Physics"],
    color: "from-primary to-primary-dark",
    initials: "TR",
  },
  {
    name: "Ayesha Tabassum",
    role: "Instructor",
    university: "University of Chittagong (CU)",
    subjects: ["English", "Literature"],
    color: "from-accent to-pink-500",
    initials: "AT",
  },
  {
    name: "Asifuzzaman Reyad",
    role: "Senior Instructor",
    university: "University of Chittagong (CU)",
    subjects: ["Computer Science", "Mathematics"],
    color: "from-success to-emerald-600",
    initials: "AR",
  },
];

const stats = [
  { icon: Users, value: "3+", label: "Expert Teachers", color: "text-primary" },
  { icon: GraduationCap, value: "500+", label: "Students Taught", color: "text-success" },
  { icon: BookOpen, value: "10+", label: "Subjects Covered", color: "text-accent" },
  { icon: Award, value: "10+", label: "Years Combined Experience", color: "text-warning" },
];

export default function EduMastersPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar activePage="/edu-masters" />

      {/* ── Hero ─────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <GraduationCap className="w-4 h-4" />
              শিক্ষক পরিচিতি
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
              Our Expert{" "}
              <span className="bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
                Teachers
              </span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Meet our experienced and dedicated teachers from the University of Chittagong,
              committed to guiding you towards academic excellence
            </p>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 pb-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-card rounded-2xl border border-border p-5 shadow-sm-custom hover:shadow-md-custom transition-shadow text-center"
            >
              <stat.icon className={`w-8 h-8 mx-auto mb-2 ${stat.color}`} />
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Teachers Grid ────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {teachers.map((teacher) => (
            <div
              key={teacher.name}
              className="group bg-card rounded-2xl border border-border overflow-hidden shadow-sm-custom hover:shadow-md-custom hover:border-primary/20 transition-all duration-300"
            >
              {/* Avatar */}
              <div className={`relative h-48 bg-gradient-to-br ${teacher.color} flex items-center justify-center`}>
                <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/30">
                  <span className="text-3xl font-bold text-white">
                    {teacher.initials}
                  </span>
                </div>
                <div className="absolute top-4 right-4">
                  <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-semibold">
                    {teacher.role}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-6">
                <h3 className="text-lg font-bold text-foreground">
                  {teacher.name}
                </h3>
                <div className="flex items-center gap-1.5 mt-1.5 text-muted-foreground">
                  <GraduationCap className="w-4 h-4" />
                  <span className="text-sm">{teacher.university}</span>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {teacher.subjects.map((subject) => (
                    <span
                      key={subject}
                      className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                    >
                      {subject}
                    </span>
                  ))}
                </div>

                <div className="mt-5 pt-4 border-t border-border">
                  <Link
                    href="/courses"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
                  >
                    View Courses
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────── */}
      <section className="py-16 bg-secondary/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Want to learn from the best?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Join our courses and get mentored by University of Chittagong graduates
          </p>
          <Link
            href="/courses"
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold shadow-primary hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Browse Courses
          </Link>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                <School className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-foreground">EduNova</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
              <Link href="/courses" className="hover:text-foreground transition-colors">
                Courses
              </Link>
              <Link href="/edu-masters" className="hover:text-foreground transition-colors">
                Teachers
              </Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">
                Contact
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; 2026 EduNova. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
