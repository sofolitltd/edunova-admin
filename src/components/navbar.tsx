"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { School, Menu, X } from "lucide-react";
import { isUserAuthenticated, getStoredUser, removeUserToken, removeUser, removeStoredUser } from "@/lib/auth";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/courses", label: "Courses" },
  { href: "/edu-masters", label: "Teachers" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar({ activePage }: { activePage?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const auth = isUserAuthenticated();
    setLoggedIn(auth);
    if (auth) {
      const user = getStoredUser();
      if (user) setUserName(user.full_name);
    }
  }, []);

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || "U";
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-primary">
            <School className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">EduNova</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-6 text-sm font-medium">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`transition-colors ${
                activePage === link.href
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden sm:flex items-center gap-3">
          {loggedIn ? (
            <Link
              href="/dashboard"
              className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-sm hover:shadow-md transition-shadow"
            >
              <span className="text-sm font-bold text-white">{getInitials(userName)}</span>
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition-all"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-semibold shadow-primary hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile: avatar + hamburger */}
        <div className="flex sm:hidden items-center gap-2">
          {loggedIn && (
            <Link
              href="/dashboard"
              className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-sm"
            >
              <span className="text-xs font-bold text-white">{getInitials(userName)}</span>
            </Link>
          )}
          <button
            onClick={() => setOpen(!open)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {open && (
        <>
          <div className="fixed inset-0 top-16 z-40 bg-black/50 sm:hidden" onClick={() => setOpen(false)} />
          <div className="fixed top-16 left-0 right-0 z-50 border-b border-border bg-background shadow-xl sm:hidden max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  activePage === link.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {!loggedIn && (
              <div className="pt-2 space-y-2">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="block w-full py-3 rounded-xl border border-border text-foreground text-sm font-medium text-center hover:bg-secondary transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  onClick={() => setOpen(false)}
                  className="block w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-semibold text-center shadow-primary"
                >
                  Get Started
                </Link>
              </div>
            )}
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
