"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getToken, isAuthenticated, getLoginPath } from "@/lib/auth";
import { dailyContentApi, type DailyContentItem } from "@/lib/api";
import { Plus, Edit, Trash2, X, Loader2, BookOpen, Filter } from "lucide-react";
import { toast } from "sonner";

const CONTENT_TYPES = [
  { value: "vocabulary", label: "Vocabulary (শব্দ)", color: "bg-blue-500/10 text-blue-500" },
  { value: "math", label: "Math (গণিত)", color: "bg-purple-500/10 text-purple-500" },
  { value: "science", label: "Science (বিজ্ঞান)", color: "bg-emerald-500/10 text-emerald-500" },
  { value: "news", label: "News (সংবাদ)", color: "bg-amber-500/10 text-amber-500" },
];
const CLASS_LEVELS = ["3", "4", "5", "6", "7", "8"];

export default function DailyContentPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [items, setItems] = useState<DailyContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState<DailyContentItem | null>(null);
  const [filterType, setFilterType] = useState("");
  const [filterClass, setFilterClass] = useState("");

  const [form, setForm] = useState({
    content_type: "vocabulary",
    class_level: "8",
    title: "",
    body: "",
    answer: "",
    language: "bn",
  });

  useEffect(() => {
    if (!isAuthenticated()) { router.push(getLoginPath(pathname)); return; }
    loadContent();
  }, [router, pathname, filterType, filterClass]);

  const loadContent = async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const data = await dailyContentApi.getContent(token, filterType || undefined, filterClass || undefined);
      setItems(data);
    } catch { toast.error("Failed to load content"); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setForm({ content_type: "vocabulary", class_level: "8", title: "", body: "", answer: "", language: "bn" });
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (d: DailyContentItem) => {
    setEditingId(d.id);
    setForm({ content_type: d.content_type, class_level: d.class_level, title: d.title, body: d.body, answer: d.answer, language: d.language });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.body.trim()) { toast.error("Content is required"); return; }
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      if (editingId) {
        await dailyContentApi.updateContent(token, editingId, form);
        toast.success("Content updated");
      } else {
        await dailyContentApi.createContent(token, form);
        toast.success("Content created");
      }
      resetForm();
      loadContent();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      await dailyContentApi.deleteContent(token, showDelete.id);
      toast.success("Content deleted");
      setShowDelete(null);
      loadContent();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to delete"); }
    finally { setSaving(false); }
  };

  const getTypeInfo = (type: string) => CONTENT_TYPES.find(t => t.value === type) || CONTENT_TYPES[0];
  const inputClass = "w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  // Stats
  const vocabCount = items.filter(i => i.content_type === "vocabulary").length;
  const mathCount = items.filter(i => i.content_type === "math").length;
  const scienceCount = items.filter(i => i.content_type === "science").length;
  const newsCount = items.filter(i => i.content_type === "news").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Daily Content</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage the 5-minute micro-learning content pool</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark transition-all">
          <Plus className="w-4 h-4" /> Add Content
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {CONTENT_TYPES.map((ct, idx) => {
          const counts = [vocabCount, mathCount, scienceCount, newsCount];
          return (
            <div key={ct.value} className="bg-card rounded-2xl border border-border p-4">
              <div className={`w-9 h-9 rounded-xl ${ct.color} flex items-center justify-center mb-2`}>
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="text-lg font-bold text-foreground">{counts[idx]}</div>
              <div className="text-xs text-muted-foreground">{ct.label}</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-3 py-2 pr-10 rounded-xl bg-card border border-border text-sm appearance-none bg-no-repeat bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b7280%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22></polyline></svg>)] bg-[position:right_0.75rem_center]">
          <option value="">All Types</option>
          {CONTENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="px-3 py-2 pr-10 rounded-xl bg-card border border-border text-sm appearance-none bg-no-repeat bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b7280%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22></polyline></svg>)] bg-[position:right_0.75rem_center]">
          <option value="">All Classes</option>
          {CLASS_LEVELS.map(c => <option key={c} value={c}>Class {c}</option>)}
        </select>
      </div>

      {/* Content List */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-3">No content found</p>
            <button onClick={() => { resetForm(); setShowForm(true); }} className="text-sm text-primary font-medium hover:underline">Create first item</button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map(item => {
              const typeInfo = getTypeInfo(item.content_type);
              return (
                <div key={item.id} className="px-6 py-4 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 ${typeInfo.color}`}>
                        {item.content_type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-foreground truncate">{item.title}</h3>
                          <span className="text-xs text-muted-foreground">Class {item.class_level}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.body}</p>
                        {item.answer && <p className="text-xs text-success mt-1">Answer: {item.answer}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => openEdit(item)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => setShowDelete(item)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={resetForm}>
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h3 className="font-semibold text-foreground">{editingId ? "Edit" : "Create"} Daily Content</h3>
              <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Type *</label>
                  <select value={form.content_type} onChange={(e) => setForm({ ...form, content_type: e.target.value })} className={`${inputClass} pr-10 appearance-none bg-no-repeat bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b7280%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22></polyline></svg>)] bg-[position:right_0.75rem_center]`}>
                    {CONTENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Class *</label>
                  <select value={form.class_level} onChange={(e) => setForm({ ...form, class_level: e.target.value })} className={`${inputClass} pr-10 appearance-none bg-no-repeat bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b7280%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22></polyline></svg>)] bg-[position:right_0.75rem_center]`}>
                    {CLASS_LEVELS.map(c => <option key={c} value={c}>Class {c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Title *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Content title" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Content *</label>
                <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={6} placeholder="Write content here..." className={`${inputClass} resize-none`} />
              </div>
              {(form.content_type === "vocabulary" || form.content_type === "math") && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Answer / Explanation</label>
                  <input type="text" value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} placeholder="Answer or explanation" className={inputClass} />
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={resetForm} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.title || !form.body} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-all">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDelete(null)}>
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Delete Content</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted-foreground">Delete <strong className="text-foreground">{showDelete.title}</strong>?</p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowDelete(null)} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive text-white text-sm font-medium hover:bg-destructive/90 disabled:opacity-50 transition-all">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
