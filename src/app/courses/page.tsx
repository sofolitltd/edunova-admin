"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api, type Course } from "@/lib/api";
import Navbar from "@/components/navbar";
import {
  School,
  BookOpen,
  FileText,
  Users,
  Clock,
  ArrowRight,
  Search,
  Filter,
  Star,
  GraduationCap,
  Loader2,
} from "lucide-react";





const classLevels = [
  { value: "all", label: "All Classes" },
  { value: "3", label: "Class 3" },
  { value: "4", label: "Class 4" },
  { value: "5", label: "Class 5" },
  { value: "6", label: "Class 6" },
  { value: "7", label: "Class 7" },
  { value: "8", label: "Class 8" },
];

const typeFilters = [
  { value: "all", label: "All Types" },
  { value: "free", label: "Free" },
  { value: "online", label: "Online" },
  { value: "offline", label: "Offline (Coaching)" },
];

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeClassLevel, setActiveClassLevel] = useState("all");
  const [activeType, setActiveType] = useState("all");

  useEffect(() => {
    api.getAllCourses().then((data) => setCourses(data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = courses.filter((c) => {
    const matchSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.title_bn && c.title_bn.includes(search));
    const matchClass = activeClassLevel === "all" || c.class_level === activeClassLevel;
    const matchType = activeType === "all" || c.type === activeType;
    return matchSearch && matchClass && matchType;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar activePage="/courses" />

      {/* ── Hero ─────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
              Our{" "}
              <span className="bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
                Courses
              </span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Browse our comprehensive courses designed for Bangladeshi students from Class 3 to 8
            </p>
          </div>
        </div>
      </section>

      {/* ── Filters ──────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search courses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
            />
          </div>
          <select
            value={activeClassLevel}
            onChange={(e) => setActiveClassLevel(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[160px]"
          >
            {classLevels.map(cl => <option key={cl.value} value={cl.value}>{cl.label}</option>)}
          </select>
          <select
            value={activeType}
            onChange={(e) => setActiveType(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[160px]"
          >
            {typeFilters.map(tf => <option key={tf.value} value={tf.value}>{tf.label}</option>)}
          </select>
        </div>
      </section>

      {/* ── Course Grid ──────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">No courses found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((course) => {
              const Icon = BookOpen;
              return (
                <div
                  key={course.id}
                  className="group bg-card rounded-2xl border border-border overflow-hidden shadow-sm-custom hover:shadow-md-custom hover:border-primary/20 transition-all duration-300"
                >
                  {/* Card Header */}
                  <div className={`relative h-40 bg-gradient-to-br ${course.gradient || "from-primary to-primary-dark"} p-6 flex items-end`}>
                    <div className="absolute top-4 right-4">
                      {course.badge && (
                        <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-semibold">
                          {course.badge}
                        </span>
                      )}
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2">
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5">
                    <h3 className="font-bold text-foreground text-lg leading-snug">
                      {course.title}
                    </h3>
                    {course.title_bn && (
                      <p className="text-sm text-muted-foreground mt-1">{course.title_bn}</p>
                    )}

                    <div className="flex items-center gap-1 mt-3">
                      <Star className="w-4 h-4 text-warning fill-warning" />
                      <span className="text-sm font-semibold text-foreground">{course.rating}</span>
                      <span className="text-xs text-muted-foreground ml-1">
                        ({course.students_count} students)
                      </span>
                    </div>

                    {course.instructors && (
                      <p className="text-xs text-muted-foreground mt-2">
                        by {course.instructors}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-3">
                      {course.type === "free" && (
                        <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-semibold">Free</span>
                      )}
                      {course.type === "online" && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">Online</span>
                      )}
                      {course.type === "offline" && (
                        <span className="px-2 py-0.5 rounded-full bg-warning/10 text-warning text-xs font-semibold">Offline</span>
                      )}
                      {course.class_level && (
                        <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-xs font-medium">Class {course.class_level}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4" />
                        {course.classes_count} Classes
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4" />
                        {course.exams_count} Exams
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-5 pt-4 border-t border-border">
                      <div>
                        <p className="text-xs text-muted-foreground">Starting from</p>
                        <p className="text-xl font-bold text-primary">
                          ৳{course.price.toLocaleString()}
                        </p>
                      </div>
                      <Link
                        href={`/courses/${course.id}`}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-semibold shadow-primary hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5"
                      >
                        View Details
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── CTA ─────────────────────────────────── */}
      <section className="py-16 bg-secondary/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Can&apos;t find what you&apos;re looking for?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Contact us and we&apos;ll help you choose the right course
          </p>
          <Link
            href="/contact"
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-card border border-border text-foreground font-semibold hover:bg-secondary transition-colors"
          >
            Contact Us
            <ArrowRight className="w-4 h-4" />
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
              <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
              <Link href="/courses" className="hover:text-foreground transition-colors">Courses</Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            </div>
            <p className="text-sm text-muted-foreground">&copy; 2026 EduNova. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
