"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  School,
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  BookOpen,
  HelpCircle,
  Calendar,
  BookMarked,
  Newspaper,
  User,
  Sun,
  Moon,
  GraduationCap,
  ClipboardList,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  isUserAuthenticated,
  getStoredUser,
  removeUserToken,
  removeUser,
  removeStoredUser,
} from "@/lib/auth";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/enrollments", label: "My Enrollments", icon: ClipboardList },
  { href: "/dashboard/doubts", label: "My Doubts", icon: HelpCircle },
  { href: "/dashboard/calendar", label: "Calendar", icon: Calendar },
  { href: "/dashboard/lessons", label: "Today's Lessons", icon: BookMarked },
  { href: "/dashboard/articles", label: "Parenting Hub", icon: Newspaper },
];

const accountItems = [
  { href: "/dashboard/profile", label: "My Profile", icon: User },
  { href: "/courses", label: "Browse Courses", icon: GraduationCap },
];

export default function UserDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("Student");
  const [userMobile, setUserMobile] = useState("");

  useEffect(() => {
    if (!isUserAuthenticated()) {
      router.push("/login");
      return;
    }
    const stored = getStoredUser();
    if (stored) {
      setUserName(stored.full_name || "Student");
      setUserMobile(stored.mobile || "");
    }
  }, [pathname, router]);

  useEffect(() => {
    document.title = "Dashboard - EduNova";
  }, []);

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || "U";
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleLogout = () => {
    removeUserToken();
    removeUser();
    removeStoredUser();
    router.push("/");
  };

  // Don't show sidebar on login/register pages
  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/verify-otp" ||
    pathname === "/forgot-password"
  ) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-border">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-primary">
              <School className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              EduNova
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
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

          <div className="pt-3 mt-3 border-t border-border">
            <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Account
            </p>
            {accountItems.map((item) => {
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
          </div>
        </nav>

        {/* User info + Logout */}
        <div className="p-3 border-t border-border space-y-1">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-sm">
              <span className="text-sm font-bold text-white">
                {getInitials(userName)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">
                {userName}
              </div>
              {userMobile && (
                <div className="text-xs text-muted-foreground truncate">
                  {userMobile}
                </div>
              )}
            </div>
          </div>
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
      <div className="flex-1 flex flex-col min-h-screen lg:ml-64">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="hidden lg:block">
            <h1 className="text-lg font-semibold text-foreground">
              {navItems.find(
                (item) =>
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href))
              )?.label || "Dashboard"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                setTheme(theme === "dark" ? "light" : "dark")
              }
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            >
              {theme === "dark" ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
