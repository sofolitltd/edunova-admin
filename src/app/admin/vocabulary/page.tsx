"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, isAuthenticated } from "@/lib/auth";
import { vocabularyApi, type VocabularyWord } from "@/lib/api";
import { Plus, Edit, Trash2, X, Loader2, BookMarked, Filter } from "lucide-react";
import { toast } from "sonner";

const CLASS_LEVELS = ["3", "4", "5", "6", "7", "8"];

const emptyForm = { class_level: "3", word: "", meaning: "", meaning_bn: "", example_sentence: "", pronunciation: "" };

export default function VocabularyPage() {
  const router = useRouter();
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState<VocabularyWord | null>(null);
  const [filterClass, setFilterClass] = useState("");
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/admin/login"); return; }
    loadWords();
  }, [router, filterClass]);

  const loadWords = async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const data = await vocabularyApi.getWords(token, filterClass || undefined);
      setWords(data);
    } catch { toast.error("Failed to load vocabulary"); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (w: VocabularyWord) => {
    setEditingId(w.id);
    setForm({
      class_level: w.class_level,
      word: w.word,
      meaning: w.meaning,
      meaning_bn: w.meaning_bn,
      example_sentence: w.example_sentence,
      pronunciation: w.pronunciation,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.word.trim()) { toast.error("Word is required"); return; }
    if (!form.meaning.trim()) { toast.error("Meaning is required"); return; }
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      if (editingId) {
        await vocabularyApi.updateWord(token, editingId, form);
        toast.success("Word updated");
      } else {
        await vocabularyApi.createWord(token, form);
        toast.success("Word added");
      }
      resetForm();
      loadWords();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      await vocabularyApi.deleteWord(token, showDelete.id);
      toast.success("Word deleted");
      setShowDelete(null);
      loadWords();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to delete"); }
    finally { setSaving(false); }
  };

  const inputClass = "w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vocabulary Booster</h1>
          <p className="text-sm text-muted-foreground mt-1">Words used for both flashcards and the vocabulary quiz — class-tiered 3 to 8</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark transition-all">
          <Plus className="w-4 h-4" /> Add Word
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="px-3 py-2 rounded-xl bg-card border border-border text-sm">
          <option value="">All Classes</option>
          {CLASS_LEVELS.map(c => <option key={c} value={c}>Class {c}</option>)}
        </select>
        {filterClass && words.length > 0 && words.length < 4 && (
          <span className="text-xs text-warning">Only {words.length} word(s) in Class {filterClass} — the quiz needs at least 4 to generate options.</span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">Loading...</div>
        ) : words.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <BookMarked className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-3">No vocabulary words found</p>
            <button onClick={() => { resetForm(); setShowForm(true); }} className="text-sm text-primary font-medium hover:underline">Add first word</button>
          </div>
        ) : words.map(w => (
          <div key={w.id} className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-3">
              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">Class {w.class_level}</span>
            </div>
            <h3 className="font-semibold text-foreground mb-1">{w.word}</h3>
            <p className="text-sm text-muted-foreground mb-1">{w.meaning}</p>
            {w.meaning_bn && <p className="text-sm text-muted-foreground mb-2">{w.meaning_bn}</p>}
            {w.example_sentence && <p className="text-xs text-muted-foreground italic line-clamp-2 mb-3">&quot;{w.example_sentence}&quot;</p>}
            <div className="flex items-center gap-2 pt-3 border-t border-border">
              <button onClick={() => openEdit(w)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-all">
                <Edit className="w-3.5 h-3.5" /> Edit
              </button>
              <button onClick={() => setShowDelete(w)} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-all">
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
              <h3 className="font-semibold text-foreground">{editingId ? "Edit" : "Add"} Word</h3>
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
                  <label className="block text-sm font-medium text-foreground mb-1.5">Word *</label>
                  <input type="text" value={form.word} onChange={(e) => setForm({ ...form, word: e.target.value })} placeholder="e.g. Diligent" className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Meaning (English) *</label>
                <input type="text" value={form.meaning} onChange={(e) => setForm({ ...form, meaning: e.target.value })} placeholder="e.g. Hard-working and careful" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Meaning (Bangla)</label>
                <input type="text" value={form.meaning_bn} onChange={(e) => setForm({ ...form, meaning_bn: e.target.value })} placeholder="e.g. পরিশ্রমী" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Example Sentence</label>
                <input type="text" value={form.example_sentence} onChange={(e) => setForm({ ...form, example_sentence: e.target.value })} placeholder="Shown on the flashcard back" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Pronunciation</label>
                <input type="text" value={form.pronunciation} onChange={(e) => setForm({ ...form, pronunciation: e.target.value })} placeholder="Optional" className={inputClass} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={resetForm} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.word || !form.meaning} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-all">
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
              <h3 className="font-semibold text-foreground">Delete Word</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted-foreground">Delete <strong className="text-foreground">{showDelete.word}</strong>? This cannot be undone.</p>
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
