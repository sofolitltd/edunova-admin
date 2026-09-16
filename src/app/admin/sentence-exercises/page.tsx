"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, isAuthenticated } from "@/lib/auth";
import { sentenceExerciseApi, type SentenceExercise } from "@/lib/api";
import { Plus, Edit, Trash2, X, Loader2, PenLine, Filter } from "lucide-react";
import { toast } from "sonner";

const CLASS_LEVELS = ["3", "4", "5", "6", "7", "8"];

const emptyForm = { class_level: "3", prompt: "", sample_answer: "" };

export default function SentenceExercisesPage() {
  const router = useRouter();
  const [exercises, setExercises] = useState<SentenceExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState<SentenceExercise | null>(null);
  const [filterClass, setFilterClass] = useState("");
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/admin/login"); return; }
    loadExercises();
  }, [router, filterClass]);

  const loadExercises = async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const data = await sentenceExerciseApi.getExercises(token, filterClass || undefined);
      setExercises(data);
    } catch { toast.error("Failed to load exercises"); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (e: SentenceExercise) => {
    setEditingId(e.id);
    setForm({ class_level: e.class_level, prompt: e.prompt, sample_answer: e.sample_answer });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.prompt.trim()) { toast.error("Prompt word is required"); return; }
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      if (editingId) {
        await sentenceExerciseApi.updateExercise(token, editingId, form);
        toast.success("Exercise updated");
      } else {
        await sentenceExerciseApi.createExercise(token, form);
        toast.success("Exercise added");
      }
      resetForm();
      loadExercises();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      await sentenceExerciseApi.deleteExercise(token, showDelete.id);
      toast.success("Exercise deleted");
      setShowDelete(null);
      loadExercises();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to delete"); }
    finally { setSaving(false); }
  };

  const inputClass = "w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sentence Construction</h1>
          <p className="text-sm text-muted-foreground mt-1">Prompt words for students to build a sentence with — self-checked against a sample answer</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark transition-all">
          <Plus className="w-4 h-4" /> Add Exercise
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="px-3 py-2 rounded-xl bg-card border border-border text-sm">
          <option value="">All Classes</option>
          {CLASS_LEVELS.map(c => <option key={c} value={c}>Class {c}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">Loading...</div>
        ) : exercises.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <PenLine className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-3">No exercises found</p>
            <button onClick={() => { resetForm(); setShowForm(true); }} className="text-sm text-primary font-medium hover:underline">Add first exercise</button>
          </div>
        ) : exercises.map(e => (
          <div key={e.id} className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-3">
              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">Class {e.class_level}</span>
            </div>
            <h3 className="font-semibold text-foreground mb-2">{e.prompt}</h3>
            {e.sample_answer && <p className="text-sm text-muted-foreground italic line-clamp-3 mb-3">&quot;{e.sample_answer}&quot;</p>}
            <div className="flex items-center gap-2 pt-3 border-t border-border">
              <button onClick={() => openEdit(e)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-all">
                <Edit className="w-3.5 h-3.5" /> Edit
              </button>
              <button onClick={() => setShowDelete(e)} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={resetForm}>
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h3 className="font-semibold text-foreground">{editingId ? "Edit" : "Add"} Exercise</h3>
              <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Class *</label>
                <select value={form.class_level} onChange={(e) => setForm({ ...form, class_level: e.target.value })} className={inputClass}>
                  {CLASS_LEVELS.map(c => <option key={c} value={c}>Class {c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Prompt Word/Phrase *</label>
                <input type="text" value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} placeholder="e.g. diligent" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Sample Answer</label>
                <textarea value={form.sample_answer} onChange={(e) => setForm({ ...form, sample_answer: e.target.value })} rows={3} placeholder="Shown after the student submits, for self-checking" className={`${inputClass} resize-none`} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={resetForm} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.prompt} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-all">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDelete(null)}>
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Delete Exercise</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted-foreground">Delete the exercise for <strong className="text-foreground">{showDelete.prompt}</strong>? This cannot be undone.</p>
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
