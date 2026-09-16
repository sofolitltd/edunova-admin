"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, isAuthenticated } from "@/lib/auth";
import { notesApi, type Note } from "@/lib/api";
import { Plus, Edit, Trash2, X, Loader2, BookOpen, Filter } from "lucide-react";
import { toast } from "sonner";

const CLASS_LEVELS = ["3", "4", "5", "6", "7", "8"];
// value is what's stored/sent to the API and must match the Flutter app's subject
// filter chips exactly (they filter by exact string match); label is what admins see.
const SUBJECTS = [
  { value: "Math", label: "গণিত" },
  { value: "Science", label: "বিজ্ঞান" },
  { value: "English", label: "ইংরেজি" },
  { value: "Bengali", label: "বাংলা" },
  { value: "Social Science", label: "সমাজবিজ্ঞান" },
  { value: "Physics", label: "পদার্থবিজ্ঞান" },
  { value: "Chemistry", label: "রসায়ন" },
  { value: "Biology", label: "জীববিজ্ঞান" },
];

export default function NotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState<Note | null>(null);
  const [filterClass, setFilterClass] = useState("");
  const [filterSubject, setFilterSubject] = useState("");

  const [form, setForm] = useState({
    class_level: "8",
    subject: "Math",
    title: "",
    content: "",
    tags: "",
    is_published: true,
  });

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/admin/login"); return; }
    loadNotes();
  }, [router, filterClass, filterSubject]);

  const loadNotes = async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const data = await notesApi.getNotes(token, filterClass || undefined, filterSubject || undefined);
      setNotes(data);
    } catch { toast.error("Failed to load notes"); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setForm({ class_level: "8", subject: "Math", title: "", content: "", tags: "", is_published: true });
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (n: Note) => {
    setEditingId(n.id);
    setForm({
      class_level: n.class_level,
      subject: n.subject,
      title: n.title,
      content: n.content,
      tags: n.tags?.join(", ") || "",
      is_published: n.is_published,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.content.trim()) { toast.error("Content is required"); return; }
    const token = getToken();
    if (!token) return;
    setSaving(true);
    const tags = form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
    try {
      const payload = { ...form, tags };
      if (editingId) {
        await notesApi.updateNote(token, editingId, payload);
        toast.success("Note updated");
      } else {
        await notesApi.createNote(token, payload);
        toast.success("Note created");
      }
      resetForm();
      loadNotes();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      await notesApi.deleteNote(token, showDelete.id);
      toast.success("Note deleted");
      setShowDelete(null);
      loadNotes();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to delete"); }
    finally { setSaving(false); }
  };

  const inputClass = "w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
  const subjectLabel = (value: string) => SUBJECTS.find(s => s.value === value)?.label || value;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notes Library</h1>
          <p className="text-sm text-muted-foreground mt-1">Class-exclusive study notes for all students</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark transition-all">
          <Plus className="w-4 h-4" /> Add Note
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="px-3 py-2 rounded-xl bg-card border border-border text-sm">
          <option value="">All Classes</option>
          {CLASS_LEVELS.map(c => <option key={c} value={c}>Class {c}</option>)}
        </select>
        <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="px-3 py-2 rounded-xl bg-card border border-border text-sm">
          <option value="">All Subjects</option>
          {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">Loading...</div>
        ) : notes.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-3">No notes found</p>
            <button onClick={() => { resetForm(); setShowForm(true); }} className="text-sm text-primary font-medium hover:underline">Create first note</button>
          </div>
        ) : notes.map(n => (
          <div key={n.id} className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">Class {n.class_level}</span>
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">{subjectLabel(n.subject)}</span>
              </div>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${n.is_published ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                {n.is_published ? "Published" : "Draft"}
              </span>
            </div>
            <h3 className="font-semibold text-foreground mb-1 line-clamp-1">{n.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{n.content}</p>
            {n.tags && n.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {n.tags.map((tag, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground">{tag}</span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 pt-3 border-t border-border">
              <button onClick={() => openEdit(n)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-all">
                <Edit className="w-3.5 h-3.5" /> Edit
              </button>
              <button onClick={() => setShowDelete(n)} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={resetForm}>
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h3 className="font-semibold text-foreground">{editingId ? "Edit" : "Create"} Note</h3>
              <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Class *</label>
                  <select value={form.class_level} onChange={(e) => setForm({ ...form, class_level: e.target.value })} className={inputClass}>
                    {CLASS_LEVELS.map(c => <option key={c} value={c}>Class {c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Subject *</label>
                  <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={inputClass}>
                    {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Title *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Note title" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Content *</label>
                <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={8} placeholder="Write note content here... (supports markdown)" className={`${inputClass} resize-none`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Tags (comma separated)</label>
                <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="important, exam-prep, chapter-1" className={inputClass} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} className="rounded border-border" />
                <label className="text-sm text-foreground">Published</label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={resetForm} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.title || !form.content} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-all">
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
              <h3 className="font-semibold text-foreground">Delete Note</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted-foreground">Delete <strong className="text-foreground">{showDelete.title}</strong>? This cannot be undone.</p>
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
