"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/navbar";
import { api, type Course } from "@/lib/api";
import {
  School,
  BookOpen,
  Users,
  Award,
  Smartphone,
  Shield,
  CheckCircle2,
  ArrowRight,
  GraduationCap,
  Target,
  Zap,
  Globe,
  Clock,
  Star,
  Loader2,
} from "lucide-react";

function CourseCard({ course, color }: { course: Course; color: string }) {
  return (
    <Link
      href={`/courses/${course.id}`}
      className="block min-w-[240px] bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-all group"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
          course.type === "free" ? "bg-success/10 text-success" :
          course.type === "offline" ? "bg-warning/10 text-warning" :
          "bg-primary/10 text-primary"
        }`}>
          {course.type === "free" ? "ফ্রী" : course.type === "offline" ? "অফলাইন" : "অনলাইন"}
        </span>
        {course.class_level && (
          <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground text-xs font-medium">
            Class {course.class_level}
          </span>
        )}
      </div>
      <h3 className="font-semibold text-foreground text-sm leading-snug group-hover:text-primary transition-colors">
        {course.title_bn || course.title}
      </h3>
      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
        {course.schedule && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {course.schedule}
          </span>
        )}
      </div>
      <div className="mt-3">
        {course.type === "free" ? (
          <span className="text-sm font-bold text-success">ফ্রী</span>
        ) : (
          <span className="text-sm font-bold text-foreground">৳{course.price}</span>
        )}
      </div>
    </Link>
  );
}

export default function LandingPage() {
  const [freeCourses, setFreeCourses] = useState<Course[]>([]);
  const [offlineCourses, setOfflineCourses] = useState<Course[]>([]);
  const [onlineCourses, setOnlineCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getAllCourses().then((courses) => courses.filter((c) => c.type === "free")),
      api.getAllCourses().then((courses) => courses.filter((c) => c.type === "offline")),
      api.getAllCourses().then((courses) => courses.filter((c) => c.type === "online")),
    ]).then(([free, offline, online]) => {
      setFreeCourses(free);
      setOfflineCourses(offline);
      setOnlineCourses(online);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Hero ─────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-28 sm:pt-28 sm:pb-36">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
              <Zap className="w-4 h-4" />
              The Future of Education
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
              Learn Without{" "}
              <span className="bg-gradient-to-r from-primary via-primary-dark to-accent bg-clip-text text-transparent">
                Limits
              </span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              EduNova is a modern education platform built for Bangladeshi
              students. Access courses, take exams, track progress &mdash; all
              from your phone.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold text-lg shadow-primary hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                Start Learning
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#features"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl border-2 border-border text-foreground font-semibold text-lg hover:bg-secondary transition-colors text-center"
              >
                Learn More
              </a>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="mt-16 relative max-w-4xl mx-auto">
            <div className="rounded-3xl border border-border bg-card p-2 shadow-lg-custom">
              <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 p-8 sm:p-12">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { icon: BookOpen, label: "Courses", value: "50+", color: "text-primary" },
                    { icon: Users, label: "Students", value: "1,200+", color: "text-success" },
                    { icon: Award, label: "Results", value: "95%", color: "text-accent" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="bg-card/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 text-center border border-border/50"
                    >
                      <stat.icon className={`w-8 h-8 mx-auto mb-2 ${stat.color}`} />
                      <p className="text-2xl sm:text-3xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-4 bg-primary/10 rounded-full blur-xl" />
          </div>
        </div>
      </section>

      {/* ── Course Sections ──────────────────────── */}
      {!loading && (freeCourses.length > 0 || offlineCourses.length > 0 || onlineCourses.length > 0) && (
        <section className="py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            {/* Free Courses */}
            {freeCourses.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground">ফ্রী কোর্স</h2>
                    <p className="text-muted-foreground mt-1">বিনামূল্যে কোর্সে ভর্তি হন</p>
                  </div>
                  <Link href="/courses?type=free" className="text-sm font-semibold text-success hover:underline flex items-center gap-1">
                    সব দেখুন <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {freeCourses.map((course) => (
                    <CourseCard key={course.id} course={course} color="success" />
                  ))}
                </div>
              </div>
            )}

            {/* Offline Batches */}
            {offlineCourses.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground">অফলাইন ব্যাচ</h2>
                    <p className="text-muted-foreground mt-1">কোচিং সেন্টারে ক্লাস</p>
                  </div>
                  <Link href="/courses?type=offline" className="text-sm font-semibold text-warning hover:underline flex items-center gap-1">
                    সব দেখুন <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {offlineCourses.map((course) => (
                    <CourseCard key={course.id} course={course} color="warning" />
                  ))}
                </div>
              </div>
            )}

            {/* Online Courses */}
            {onlineCourses.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground">অনলাইন কোর্স</h2>
                    <p className="text-muted-foreground mt-1">ঘরে বসে পড়ুন</p>
                  </div>
                  <Link href="/courses?type=online" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
                    সব দেখুন <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {onlineCourses.map((course) => (
                    <CourseCard key={course.id} course={course} color="primary" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {loading && (
        <section className="py-16 flex justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </section>
      )}

      {/* ── Features ─────────────────────────────── */}
      <section id="features" className="py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Everything you need to{" "}
              <span className="text-primary">succeed</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              A complete platform designed to make learning accessible,
              engaging, and effective.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: BookOpen,
                title: "Smart Courses",
                desc: "Access organized courses with schedules, materials, and progress tracking across all subjects.",
                color: "from-primary to-primary-dark",
              },
              {
                icon: Target,
                title: "Interactive Exams",
                desc: "Take timed MCQ exams with instant results, question navigator, and performance analytics.",
                color: "from-accent to-pink-500",
              },
              {
                icon: Smartphone,
                title: "Mobile First",
                desc: "Designed for phones. Available in English and Bengali with a beautiful, intuitive interface.",
                color: "from-success to-emerald-600",
              },
              {
                icon: Shield,
                title: "Secure & Private",
                desc: "Your data is encrypted and protected. OTP verification keeps your account safe.",
                color: "from-warning to-amber-600",
              },
              {
                icon: Globe,
                title: "Bilingual Support",
                desc: "Full Bengali and English localization. Switch languages instantly from the app.",
                color: "from-blue-500 to-blue-600",
              },
              {
                icon: GraduationCap,
                title: "Track Progress",
                desc: "Monitor your scores, course completion, and academic performance in one dashboard.",
                color: "from-purple-500 to-purple-600",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm-custom hover:shadow-md-custom hover:border-primary/20 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────── */}
      <section className="py-24 sm:py-32 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">How it works</h2>
            <p className="mt-4 text-lg text-muted-foreground">Get started in three simple steps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Register", desc: "Create your account with your mobile number. Verify with OTP sent via SMS." },
              { step: "02", title: "Enroll", desc: "Browse available courses, view schedules, and enroll in your classes." },
              { step: "03", title: "Learn & Grow", desc: "Attend classes, take exams, and track your academic progress over time." },
            ].map((item, i) => (
              <div key={item.step} className="relative">
                <div className="bg-card rounded-2xl border border-border p-8 shadow-sm-custom h-full">
                  <span className="text-5xl font-extrabold text-primary/15">{item.step}</span>
                  <h3 className="text-xl font-semibold text-foreground mt-4 mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 -translate-y-1/2 text-muted-foreground">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────── */}
      <section className="py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-br from-primary to-primary-dark p-10 sm:p-16">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              {[
                { value: "1,200+", label: "Active Students" },
                { value: "50+", label: "Courses Available" },
                { value: "95%", label: "Pass Rate" },
                { value: "4.8", label: "Student Rating" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-3xl sm:text-4xl font-extrabold text-white">{stat.value}</p>
                  <p className="mt-2 text-sm sm:text-base text-white/70">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────── */}
      <section className="py-24 sm:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Ready to start your{" "}
            <span className="text-primary">learning journey</span>?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Join thousands of students already learning on EduNova. It&apos;s free to get started.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold text-lg shadow-primary hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            {["Free to use", "No credit card required", "Bengali & English"].map((item) => (
              <div key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-success" />
                {item}
              </div>
            ))}
          </div>
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
              <Link href="/courses" className="hover:text-foreground transition-colors">Courses</Link>
              <Link href="/edu-masters" className="hover:text-foreground transition-colors">Teachers</Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
              <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            </div>
            <p className="text-sm text-muted-foreground">&copy; 2026 EduNova. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
