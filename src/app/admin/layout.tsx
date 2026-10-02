"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isAuthenticated, getToken, removeToken } from "@/lib/auth";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  ClipboardList,
  LogOut,
  School,
  Menu,
  X,
  Sun,
  Moon,
  Database,
  HelpCircle,
  User,
  Shield,
  Wallet,
  BarChart3,
  Layers,
  UserCheck,
  Calendar,
  BookMarked,
  CreditCard,
  Newspaper,
  Bell,
  StickyNote,
  Lightbulb,
  GraduationCap,
  Award,
  Sparkles,
  PenLine,
  GraduationCap as TeacherIcon,
  ScanLine,
  CheckSquare,
  Ticket,
  ChevronDown,
  MessageSquare,
  Search,
} from "lucide-react";
import { useTheme } from "next-themes";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
type NavSection = { id: string; label: string; items: NavItem[] };

const sections: NavSection[] = [
  {
    id: "academics",
    label: "Academics",
    items: [
      { href: "/admin/academic-management", label: "Curriculum", icon: HelpCircle },
      { href: "/admin/batches", label: "Batches", icon: Layers },
      { href: "/admin/enrollments", label: "Enrollments", icon: ClipboardList },
      { href: "/admin/lessons", label: "Lessons", icon: BookMarked },
      { href: "/admin/calendar", label: "Calendar", icon: Calendar },
      { href: "/admin/question-bank", label: "Question Bank", icon: Database },
      { href: "/admin/courses", label: "Courses", icon: BookOpen },
    ],
  },
  {
    id: "exams",
    label: "Exams",
    items: [
      { href: "/admin/exams", label: "Exams", icon: FileText },
      { href: "/admin/results", label: "Results", icon: Award },
    ],
  },
  {
    id: "students",
    label: "Students",
    items: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/attendance", label: "Attendance", icon: UserCheck },
      { href: "/admin/doubts", label: "Doubts", icon: HelpCircle },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    items: [
      { href: "/admin/finance", label: "Finance Dashboard", icon: BarChart3 },
      { href: "/admin/expenses", label: "Expenses", icon: Wallet },
      { href: "/admin/payments", label: "Payments", icon: CreditCard },
      { href: "/admin/promo-codes", label: "Promo Codes", icon: Ticket },
    ],
  },
  {
    id: "omr",
    label: "OMR",
    items: [
      { href: "/admin/omr/create", label: "OMR Create", icon: ScanLine },
      { href: "/admin/omr/token", label: "OMR Token", icon: Ticket },
      { href: "/admin/omr/evaluate", label: "OMR Evaluate", icon: CheckSquare },
    ],
  },
  {
    id: "content",
    label: "Content",
    items: [
      { href: "/admin/notes", label: "Notes Library", icon: StickyNote },
      { href: "/admin/daily-content", label: "Daily Content", icon: Lightbulb },
      { href: "/admin/vocabulary", label: "Vocabulary Booster", icon: Sparkles },
      { href: "/admin/sentence-exercises", label: "Sentence Practice", icon: PenLine },
      { href: "/admin/transitions", label: "Transitions", icon: GraduationCap },
    ],
  },
  {
    id: "communication",
    label: "Communication",
    items: [
      { href: "/admin/articles", label: "Parenting Hub", icon: Newspaper },
      { href: "/admin/notifications", label: "Notifications", icon: Bell },
      { href: "/admin/sms", label: "SMS", icon: MessageSquare },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminName, setAdminName] = useState("Admin");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminRole, setAdminRole] = useState("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isMac, setIsMac] = useState(false);

  const administrationSection: NavSection | null =
    adminRole === "master_admin" || adminRole === "admin"
      ? {
          id: "administration",
          label: "Administration",
          items: [
            ...(adminRole === "master_admin"
              ? [{ href: "/admin/admins", label: "Admins", icon: Shield }]
              : []),
            { href: "/admin/teachers", label: "Teachers", icon: TeacherIcon },
          ],
        }
      : null;

  const searchableItems = useMemo(() => {
    const allSections = [...sections, ...(administrationSection ? [administrationSection] : [])];
    const items = allSections.flatMap((section) =>
      section.items.map((item) => ({ ...item, section: section.label }))
    );
    return [
      ...navItems.map((item) => ({ ...item, section: "" })),
      ...items,
      { href: "/admin/profile", label: "Profile", icon: User, section: "" },
    ];
  }, [administrationSection]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return searchableItems;
    return searchableItems.filter(
      (item) => item.label.toLowerCase().includes(q) || item.section.toLowerCase().includes(q)
    );
  }, [searchQuery, searchableItems]);

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
  };

  const goToSearchResult = (href: string) => {
    closeSearch();
    router.push(href);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === "Escape") {
        closeSearch();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!isAuthenticated() && pathname !== "/admin/login") {
      router.push("/admin/login");
      return;
    }
    loadAdmin();
  }, [pathname, router]);

  useEffect(() => {
    document.title = "Admin - EduNova";
  }, []);

  useEffect(() => {
    setIsMac(navigator.platform.includes("Mac"));
  }, []);

  useEffect(() => {
    syncOpenSections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const syncOpenSections = () => {
    let stored: Record<string, boolean> = {};
    try {
      stored = JSON.parse(localStorage.getItem("edunova_admin_open_sections") || "{}");
    } catch {}
    const allSections = [...sections, ...(administrationSection ? [administrationSection] : [])];
    const activeSection = allSections.find((s) =>
      s.items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
    );
    setOpenSections({ ...stored, ...(activeSection ? { [activeSection.id]: true } : {}) });
  };

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem("edunova_admin_open_sections", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const loadAdmin = () => {
    const stored = localStorage.getItem("edunova_admin");
    if (stored) {
      try {
        const admin = JSON.parse(stored);
        if (admin.full_name) setAdminName(admin.full_name);
        if (admin.email) setAdminEmail(admin.email);
        if (admin.role) setAdminRole(admin.role);
      } catch {}
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "A";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || "A";
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleLogout = () => {
    removeToken();
    localStorage.removeItem("edunova_admin");
    router.push("/admin/login");
  };

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

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
            <School className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            EduNova
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

          {[...sections, ...(administrationSection ? [administrationSection] : [])].map((section) => {
            const isOpen = !!openSections[section.id];
            const hasActive = section.items.some(
              (item) => pathname === item.href || pathname.startsWith(item.href + "/")
            );
            return (
              <div key={section.id} className="pt-3 mt-3 border-t border-border">
                <button
                  onClick={() => toggleSection(section.id)}
                  className={`flex items-center justify-between w-full px-3 mb-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
                    hasActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {section.label}
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="space-y-1 mt-1">
                    {section.items.map((item) => {
                      const active =
                        pathname === item.href || pathname.startsWith(item.href + "/");
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
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border space-y-1">
          <Link
            href="/admin/profile"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              pathname === "/admin/profile"
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
              onClick={() => setSearchOpen(true)}
              title={`Search menu (${isMac ? "⌘K" : "Ctrl K"})`}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="w-px h-6 bg-border" />
            <Link
              href="/admin/profile"
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-secondary transition-all group"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <span className="text-sm font-bold text-white">
                  {getInitials(adminName)}
                </span>
              </div>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium text-foreground leading-tight">{adminName}</span>
                {adminEmail && <span className="text-xs text-muted-foreground leading-tight">{adminEmail}</span>}
              </div>
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>

      {/* Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/50" onClick={closeSearch}>
          <div
            className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchResults.length > 0) goToSearchResult(searchResults[0].href);
                }}
                placeholder="Search menus (e.g. SMS, Question Bank)..."
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <button onClick={closeSearch} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {searchResults.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">No matches</div>
              ) : (
                searchResults.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => goToSearchResult(item.href)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-left text-foreground hover:bg-secondary transition-colors"
                  >
                    <item.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.section && <span className="text-xs text-muted-foreground">{item.section}</span>}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
