"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isTeacherAuthenticated, getStoredTeacher, removeTeacherToken, removeStoredTeacher } from "@/lib/auth";
import Link from "next/link";
import {
  LayoutDashboard,
  UserCheck,
  BookMarked,
  Lightbulb,
  FileText,
  Award,
  HelpCircle,
  LogOut,
  GraduationCap,
  Menu,
  X,
  Sun,
  Moon,
  User,
} from "lucide-react";
import { useTheme } from "next-themes";

const navItems = [
  { href: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teacher/attendance", label: "Attendance", icon: UserCheck },
  { href: "/teacher/lessons", label: "Lessons", icon: BookMarked },
  { href: "/teacher/daily-content", label: "Daily Content", icon: Lightbulb },
  { href: "/teacher/exams", label: "Exams", icon: FileText },
  { href: "/teacher/results", label: "Results", icon: Award },
  { href: "/teacher/doubts", label: "Doubts", icon: HelpCircle },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [teacherName, setTeacherName] = useState("Teacher");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (pathname === "/teacher/login") return;

    if (!isTeacherAuthenticated()) {
      router.push("/teacher/login");
      return;
    }

    const teacher = getStoredTeacher();
    if (teacher?.full_name) setTeacherName(teacher.full_name);
    if (teacher?.email) setTeacherEmail(teacher.email);
    setReady(true);
  }, [pathname, router]);

  useEffect(() => {
    document.title = "Teacher - EduNova";
  }, []);

  const getInitials = (name: string) => {
    if (!name) return "T";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || "T";
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleLogout = () => {
    removeTeacherToken();
    removeStoredTeacher();
    router.push("/teacher/login");
  };

  if (pathname === "/teacher/login") {
    return <>{children}</>;
  }

  if (!ready) return null;

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            EduNova Teacher
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border space-y-1">
          <Link
            href="/teacher/profile"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              pathname === "/teacher/profile"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <User className="w-5 h-5" />
            Profile
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all w-full"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 flex-shrink-0 flex items-center justify-between px-4 lg:px-8 border-b border-border bg-card/80 backdrop-blur-sm z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="hidden lg:block" />

          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="w-px h-6 bg-border" />
            <Link
              href="/teacher/profile"
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-secondary transition-all group"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <span className="text-sm font-bold text-white">
                  {getInitials(teacherName)}
                </span>
              </div>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium text-foreground leading-tight">{teacherName}</span>
                {teacherEmail && <span className="text-xs text-muted-foreground leading-tight">{teacherEmail}</span>}
              </div>
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
