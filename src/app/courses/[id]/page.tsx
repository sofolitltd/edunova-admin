"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, type Course } from "@/lib/api";
import Navbar from "@/components/navbar";
import {
  School,
  Star,
  Clock,
  Users,
  BookOpen,
  FileText,
  Video,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ArrowLeft,
  GraduationCap,
  Calendar,
  Play,
  Loader2,
} from "lucide-react";

export default function CourseDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "curriculum" | "instructor" | "reviews">("overview");
  const [expandedMonth, setExpandedMonth] = useState<number | null>(0);

  useEffect(() => {
    api.getCourse(Number(id))
      .then((data) => setCourse(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-lg">Course not found</p>
          <Link href="/courses" className="mt-4 inline-block text-primary font-semibold hover:underline">
            Browse Courses
          </Link>
        </div>
      </div>
    );
  }

  const curriculum = Array.isArray(course.curriculum) ? course.curriculum : [];
  const features = Array.isArray(course.features) ? course.features : [];
  const initials = course.teacher.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <Navbar activePage="/courses" />

      {/* ── Banner ────────────────────────────────── */}
      <section className={`relative bg-gradient-to-br ${course.gradient || "from-primary to-primary-dark"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <Link href="/courses" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            All Courses
          </Link>
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="flex-1 text-white">
              {course.badge && (
                <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-semibold">{course.badge}</span>
              )}
              <h1 className="text-3xl sm:text-4xl font-extrabold mt-4 leading-tight">{course.title}</h1>
              {course.title_bn && <p className="mt-2 text-white/70 text-lg">{course.title_bn}</p>}
              <div className="flex items-center gap-3 mt-4">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`w-4 h-4 ${s <= Math.round(course.rating) ? "text-warning fill-warning" : "text-white/30"}`} />
                  ))}
                </div>
                <span className="font-semibold">{course.rating}</span>
                <span className="text-white/60">({course.reviews_count.toLocaleString()} reviews)</span>
              </div>
              <div className="flex items-center gap-4 mt-4 text-white/70 text-sm">
                <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {course.students_count} students</span>
                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {course.duration}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Content ──────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Tabs */}
            <div className="flex gap-1 bg-card rounded-xl border border-border p-1 overflow-x-auto">
              {(["overview", "curriculum", "instructor", "reviews"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2.5 rounded-lg text-sm font-medium capitalize whitespace-nowrap transition-all ${
                    activeTab === tab
                      ? "bg-primary text-white shadow-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="bg-card rounded-2xl border border-border p-6 shadow-sm-custom">
                  <h2 className="text-xl font-bold text-foreground mb-4">About This Course</h2>
                  <p className="text-muted-foreground leading-relaxed">{course.description || "No description available."}</p>
                </div>

                {features.length > 0 && (
                  <div className="bg-card rounded-2xl border border-border p-6 shadow-sm-custom">
                    <h2 className="text-xl font-bold text-foreground mb-4">What You&apos;ll Get</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {features.map((f) => (
                        <div key={f} className="flex items-center gap-2.5">
                          <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
                          <span className="text-sm text-foreground">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-card rounded-2xl border border-border p-6 shadow-sm-custom">
                  <h2 className="text-xl font-bold text-foreground mb-4">Course Highlights</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { icon: Video, label: "Live Classes", value: `${course.classes_count}+` },
                      { icon: FileText, label: "Exams", value: `${course.exams_count}+` },
                      { icon: Clock, label: "Duration", value: course.duration || "TBD" },
                      { icon: Users, label: "Students", value: course.students_count.toString() },
                    ].map((h) => (
                      <div key={h.label} className="text-center p-4 rounded-xl bg-secondary/50">
                        <h.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                        <p className="text-lg font-bold text-foreground">{h.value}</p>
                        <p className="text-xs text-muted-foreground">{h.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "curriculum" && (
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm-custom">
                <h2 className="text-xl font-bold text-foreground mb-2">Course Curriculum</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  {course.classes_count}+ lectures · {course.duration || "TBD"}
                </p>
                {curriculum.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Curriculum coming soon.</p>
                ) : (
                  <div className="space-y-3">
                    {curriculum.map((section, i) => (
                      <div key={i} className="border border-border rounded-xl overflow-hidden">
                        <button
                          onClick={() => setExpandedMonth(expandedMonth === i ? null : i)}
                          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-secondary/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                              {i + 1}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{section.month}</p>
                              <p className="text-xs text-muted-foreground">{section.topics.length} topics</p>
                            </div>
                          </div>
                          {expandedMonth === i ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                        </button>
                        {expandedMonth === i && (
                          <div className="px-5 pb-4 border-t border-border">
                            <ul className="mt-3 space-y-2">
                              {section.topics.map((topic) => (
                                <li key={topic} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                                  <Play className="w-3.5 h-3.5 text-primary" />
                                  {topic}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "instructor" && (
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm-custom">
                <h2 className="text-xl font-bold text-foreground mb-6">
                  {course.instructors ? "Meet Your Instructors" : "Meet Your Instructor"}
                </h2>
                {course.instructors ? (
                  <div className="space-y-4">
                    {course.instructors.split(",").map((name, idx) => {
                      const trimmed = name.trim();
                      const initials = trimmed.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                      return (
                        <div key={idx} className="flex items-start gap-5">
                          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${course.gradient || "from-primary to-primary-dark"} flex items-center justify-center shrink-0`}>
                            <span className="text-xl font-bold text-white">{initials}</span>
                          </div>
                          <div>
                            <h3 className="font-bold text-foreground">{trimmed}</h3>
                            <p className="text-primary text-sm font-medium">Instructor</p>
                            <div className="flex items-center gap-1.5 mt-1 text-muted-foreground text-sm">
                              <GraduationCap className="w-4 h-4" />
                              University of Chittagong (CU)
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-start gap-5">
                    <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${course.gradient || "from-primary to-primary-dark"} flex items-center justify-center shrink-0`}>
                      <span className="text-2xl font-bold text-white">{initials}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{course.teacher}</h3>
                      <p className="text-primary font-medium">Instructor</p>
                      <div className="flex items-center gap-1.5 mt-1 text-muted-foreground text-sm">
                        <GraduationCap className="w-4 h-4" />
                        University of Chittagong (CU)
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                        Dedicated educator with years of experience in helping students achieve academic excellence.
                      </p>
                    </div>
                  </div>
                )}
                <Link href="/edu-masters" className="mt-4 inline-flex items-center gap-1 text-sm text-primary font-semibold hover:underline">
                  View All Instructors
                </Link>
              </div>
            )}

            {activeTab === "reviews" && (
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm-custom">
                <h2 className="text-xl font-bold text-foreground mb-6">Student Reviews</h2>
                <div className="flex items-center gap-6 mb-8">
                  <div className="text-center">
                    <p className="text-4xl font-extrabold text-foreground">{course.rating}</p>
                    <div className="flex gap-0.5 mt-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-4 h-4 ${s <= Math.round(course.rating) ? "text-warning fill-warning" : "text-muted-foreground"}`} />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{course.reviews_count.toLocaleString()} reviews</p>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {[
                      { stars: 5, pct: 75 },
                      { stars: 4, pct: 20 },
                      { stars: 3, pct: 4 },
                      { stars: 2, pct: 1 },
                      { stars: 1, pct: 0 },
                    ].map((r) => (
                      <div key={r.stars} className="flex items-center gap-2 text-sm">
                        <span className="w-8 text-muted-foreground">{r.stars}★</span>
                        <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full bg-warning rounded-full" style={{ width: `${r.pct}%` }} />
                        </div>
                        <span className="w-10 text-right text-muted-foreground">{r.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-center text-muted-foreground py-8">No reviews yet for this course.</p>
              </div>
            )}
          </div>

          {/* ── Sidebar ────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm-custom">
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="text-3xl font-extrabold text-primary">৳{course.price.toLocaleString()}</span>
                  {course.old_price > 0 && (
                    <span className="text-lg text-muted-foreground line-through">৳{course.old_price.toLocaleString()}</span>
                  )}
                </div>
                {course.old_price > 0 && (
                  <span className="inline-block px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold mb-4">
                    Save ৳{(course.old_price - course.price).toLocaleString()}
                  </span>
                )}

                <div className="space-y-3 mb-6">
                  {[
                    { icon: Clock, label: "Duration", value: course.duration || "TBD" },
                    { icon: Video, label: "Total Lectures", value: `${course.classes_count}+` },
                    { icon: Users, label: "Students Enrolled", value: course.students_count.toString() },
                    { icon: FileText, label: "Total Exams", value: `${course.exams_count}+` },
                    { icon: Calendar, label: "Live Classes", value: `${course.classes_count}` },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </span>
                      <span className="font-semibold text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href={`/courses/${id}/enroll`}
                  className="block w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold text-center shadow-primary hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all"
                >
                  Enroll Now
                </Link>

                <p className="text-center text-xs text-muted-foreground mt-3">
                  30-day money-back guarantee
                </p>
              </div>

              {/* Share */}
              <div className="bg-card rounded-2xl border border-border p-5 shadow-sm-custom">
                <h3 className="font-semibold text-foreground mb-3">Share Course</h3>
                <div className="flex gap-2">
                  <button className="flex-1 py-2 rounded-lg bg-blue-500/10 text-blue-500 text-sm font-medium hover:bg-blue-500/20 transition-colors">
                    Facebook
                  </button>
                  <button className="flex-1 py-2 rounded-lg bg-green-500/10 text-green-500 text-sm font-medium hover:bg-green-500/20 transition-colors">
                    WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────── */}
      <footer className="border-t border-border mt-12">
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
              <Link href="/edu-masters" className="hover:text-foreground transition-colors">Teachers</Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            </div>
            <p className="text-sm text-muted-foreground">&copy; 2026 EduNova. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
