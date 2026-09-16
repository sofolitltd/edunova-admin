"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserToken, isUserAuthenticated } from "@/lib/auth";
import { api, type Doubt } from "@/lib/api";
import { MessageCircleQuestion, Send, HelpCircle, CheckCircle, XCircle, Clock } from "lucide-react";

export default function MyDoubtsPage() {
  const router = useRouter();
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    question_text: "",
    subject: "",
    chapter: "",
  });

  useEffect(() => {
    if (!isUserAuthenticated()) {
      router.push("/login");
      return;
    }
    loadDoubts();
  }, [router]);

  const loadDoubts = async () => {
    const token = getUserToken();
    if (!token) return;
    try {
      const data = await api.getMyDoubts(token);
      setDoubts(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.question_text.trim()) return;
    const token = getUserToken();
    if (!token) return;

    setSubmitting(true);
    try {
      await api.submitDoubt(token, {
        question_text: form.question_text.trim(),
        subject: form.subject.trim() || undefined,
        chapter: form.chapter.trim() || undefined,
      });
      setForm({ question_text: "", subject: "", chapter: "" });
      await loadDoubts();
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return "bg-success/10 text-success";
      case "closed":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-warning/10 text-warning";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "resolved":
        return <CheckCircle className="w-3.5 h-3.5" />;
      case "closed":
        return <XCircle className="w-3.5 h-3.5" />;
      default:
        return <Clock className="w-3.5 h-3.5" />;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted-foreground">Loading doubts...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">My Doubts</h1>
        <p className="text-muted-foreground mt-1">Ask questions and track their resolution</p>
      </div>

      {/* Submit Form */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <MessageCircleQuestion className="w-5 h-5 text-primary" />
          </div>
          <h2 className="font-semibold text-foreground">Submit a Doubt</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Your Question <span className="text-destructive">*</span>
            </label>
            <textarea
              value={form.question_text}
              onChange={(e) => setForm({ ...form, question_text: e.target.value })}
              placeholder="What do you need help with?"
              rows={3}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Subject</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="e.g. Mathematics"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Chapter</label>
              <input
                type="text"
                value={form.chapter}
                onChange={(e) => setForm({ ...form, chapter: e.target.value })}
                placeholder="e.g. Algebra"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting || !form.question_text.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-4 h-4" />
            {submitting ? "Submitting..." : "Submit Doubt"}
          </button>
        </form>
      </div>

      {/* Doubts List */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">
            Submitted Doubts ({doubts.length})
          </h2>
        </div>
        {doubts.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <HelpCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No doubts submitted yet</p>
            <p className="text-sm text-muted-foreground mt-1">Use the form above to ask your first question</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {doubts.map((doubt) => (
              <div key={doubt.id} className="px-6 py-5 hover:bg-secondary/30 transition-colors">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <p className="text-sm text-foreground leading-relaxed">{doubt.question_text}</p>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize whitespace-nowrap ${getStatusBadge(doubt.status)}`}>
                    {getStatusIcon(doubt.status)}
                    {doubt.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  {doubt.subject && <span>Subject: {doubt.subject}</span>}
                  {doubt.chapter && <span>Chapter: {doubt.chapter}</span>}
                  <span>{formatDate(doubt.created_at)}</span>
                </div>
                {doubt.status === "resolved" && doubt.resolution && (
                  <div className="mt-3 rounded-xl bg-success/5 border border-success/20 p-3">
                    <p className="text-xs font-medium text-success mb-1">Resolution</p>
                    <p className="text-sm text-foreground">{doubt.resolution}</p>
                    {doubt.resolved_by_name && (
                      <p className="text-xs text-muted-foreground mt-1">Resolved by {doubt.resolved_by_name}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
