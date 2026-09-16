"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/navbar";
import {
  School,
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", mobile: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.mobile || !form.message) {
      toast.error("Please fill all fields");
      return;
    }
    setSending(true);
    await new Promise((r) => setTimeout(r, 1500));
    toast.success("Message sent! We'll get back to you soon.");
    setForm({ name: "", mobile: "", message: "" });
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar activePage="/contact" />

      {/* ── Hero ─────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
              Get In{" "}
              <span className="bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
                Touch
              </span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Have a question or need help? We&apos;re here for you. Reach out and we&apos;ll respond as soon as possible.
            </p>
          </div>
        </div>
      </section>

      {/* ── Contact Info Cards ────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: Mail,
              title: "Email",
              value: "info@edunova.com",
              sub: "We reply within 24 hours",
              color: "from-primary to-primary-dark",
            },
            {
              icon: Phone,
              title: "Phone",
              value: "+880 1XXX-XXXXXX",
              sub: "Sat–Thu, 9 AM – 10 PM",
              color: "from-success to-emerald-600",
            },
            {
              icon: MapPin,
              title: "Address",
              value: "Dhaka, Bangladesh",
              sub: "Visit us anytime",
              color: "from-accent to-pink-500",
            },
            {
              icon: Clock,
              title: "Support Hours",
              value: "9 AM – 10 PM",
              sub: "Saturday to Thursday",
              color: "from-warning to-amber-600",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="bg-card rounded-2xl border border-border p-6 shadow-sm-custom hover:shadow-md-custom transition-shadow"
            >
              <div
                className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4`}
              >
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {card.title}
              </h3>
              <p className="text-lg font-bold text-foreground mt-1">{card.value}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{card.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Form + Map ───────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form */}
          <div className="lg:col-span-3">
            <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm-custom">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Send us a message</h2>
                  <p className="text-sm text-muted-foreground">
                    Fill out the form and we&apos;ll get back to you
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Your name"
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      value={form.mobile}
                      onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                      placeholder="01XXXXXXXXX"
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Your Message
                  </label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    rows={5}
                    placeholder="Tell us how we can help you..."
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold shadow-primary hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Contact */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm-custom">
              <h3 className="font-bold text-foreground mb-4">Quick Contact</h3>
              <div className="space-y-4">
                <a
                  href="mailto:info@edunova.com"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">info@edunova.com</p>
                    <p className="text-xs text-muted-foreground">Email us anytime</p>
                  </div>
                </a>
                <a
                  href="tel:+8801XXXXXXXXX"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors group"
                >
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-colors">
                    <Phone className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">+880 1XXX-XXXXXX</p>
                    <p className="text-xs text-muted-foreground">Call us during hours</p>
                  </div>
                </a>
                <div className="flex items-center gap-3 p-3 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Dhaka, Bangladesh</p>
                    <p className="text-xs text-muted-foreground">Head office</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Social */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm-custom">
              <h3 className="font-bold text-foreground mb-4">Follow Us</h3>
              <div className="flex items-center gap-3">
                {[
                  {
                    label: "Facebook",
                    color: "hover:bg-blue-500/10 hover:text-blue-500",
                    svg: (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    ),
                  },
                  {
                    label: "YouTube",
                    color: "hover:bg-red-500/10 hover:text-red-500",
                    svg: (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                      </svg>
                    ),
                  },
                  {
                    label: "Instagram",
                    color: "hover:bg-pink-500/10 hover:text-pink-500",
                    svg: (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                      </svg>
                    ),
                  },
                ].map((s) => (
                  <a
                    key={s.label}
                    href="#"
                    className={`w-11 h-11 rounded-xl border border-border flex items-center justify-center text-muted-foreground transition-all ${s.color}`}
                  >
                    {s.svg}
                  </a>
                ))}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Stay connected for updates, tips, and new courses.
              </p>
            </div>

            {/* FAQ Link */}
            <div className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-6 text-white">
              <h3 className="font-bold text-lg mb-2">Need immediate help?</h3>
              <p className="text-white/80 text-sm mb-4">
                Check our FAQ section for instant answers to common questions.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/20 backdrop-blur-sm text-white text-sm font-semibold hover:bg-white/30 transition-colors"
              >
                Visit FAQ
              </Link>
            </div>
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
              <Link href="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
              <Link href="/courses" className="hover:text-foreground transition-colors">
                Courses
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
