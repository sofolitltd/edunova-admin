"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { getToken, isAuthenticated, getLoginPath } from "@/lib/auth";
import { resultApi, userSearchApi, type Result, type SearchUser } from "@/lib/api";
import { SUBJECTS } from "@/lib/resultSubjects";
import { useBatchFilter } from "@/hooks/useBatchFilter";
import { BatchFilterSelect } from "@/components/BatchFilterSelect";
import { Plus, Edit, Trash2, X, Loader2, ClipboardList, Search, ListChecks } from "lucide-react";
import { toast } from "sonner";

const emptyForm = {
  user_id: 0,
  subject: "Math",
  exam_name: "",
  exam_date: new Date().toISOString().slice(0, 10),
  marks_obtained: 0,
  marks_total: 100,
  remarks: "",
};

export default function ResultsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { isTeacherPortal, batches, selectedBatchId, setSelectedBatchId, batchIdNum } = useBatchFilter();
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState<Result | null>(null);

  // Filter by student
  const [filterQuery, setFilterQuery] = useState("");
  const [filterResults, setFilterResults] = useState<SearchUser[]>([]);
  const [filterStudent, setFilterStudent] = useState<SearchUser | null>(null);

  // Form: student picker
  const [form, setForm] = useState(emptyForm);
  const [studentQuery, setStudentQuery] = useState("");
  const [studentResults, setStudentResults] = useState<SearchUser[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<SearchUser | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { router.push(getLoginPath(pathname)); return; }
    loadResults();
  }, [router, pathname, filterStudent, batchIdNum]);

  const loadResults = async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const data = await resultApi.getResults(token, filterStudent?.id, batchIdNum);
      setResults(data);
    } catch { toast.error("Failed to load results"); }
    finally { setLoading(false); }
  };

  const searchStudents = async (q: string, forFilter: boolean) => {
    if (forFilter) setFilterQuery(q); else setStudentQuery(q);
    if (q.length < 2) {
      if (forFilter) setFilterResults([]); else setStudentResults([]);
      return;
    }
    const token = getToken();
    if (!token) return;
    if (!forFilter) setSearching(true);
    try {
      const data = await userSearchApi.searchUsers(token, q);
      if (forFilter) setFilterResults(data); else setStudentResults(data);
    } catch {
      if (forFilter) setFilterResults([]); else setStudentResults([]);
    } finally {
      if (!forFilter) setSearching(false);
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setSelectedStudent(null);
    setStudentQuery("");
    setStudentResults([]);
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (r: Result) => {
    setEditingId(r.id);
    setForm({
      user_id: r.user_id,
      subject: r.subject,
      exam_name: r.exam_name,
      exam_date: r.exam_date,
      marks_obtained: r.marks_obtained,
      marks_total: r.marks_total,
      remarks: r.remarks,
    });
    setSelectedStudent({ id: r.user_id, full_name: r.student_name, mobile: "", student_class: r.student_class, father_name: "", father_mobile: "", verified: true, batches: [] });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.user_id) { toast.error("Select a student"); return; }
    if (!form.exam_name.trim()) { toast.error("Exam name is required"); return; }
    if (form.marks_obtained > form.marks_total) { toast.error("Marks obtained cannot exceed total marks"); return; }
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      if (editingId) {
        await resultApi.updateResult(token, editingId, form);
        toast.success("Result updated");
      } else {
        await resultApi.createResult(token, form);
        toast.success("Result added");
      }
      resetForm();
      loadResults();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      await resultApi.deleteResult(token, showDelete.id);
      toast.success("Result deleted");
      setShowDelete(null);
      loadResults();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to delete"); }
    finally { setSaving(false); }
  };

  const inputClass = "w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
  const subjectLabel = (value: string) => SUBJECTS.find(s => s.value === value)?.label || value;
  const percentColor = (p: number) => p >= 70 ? "text-success" : p >= 50 ? "text-warning" : "text-destructive";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Results</h1>
          <p className="text-sm text-muted-foreground mt-1">Offline exam scores — the data source for each guardian&apos;s progress view</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`${isTeacherPortal ? "/teacher" : "/admin"}/results/bulk`} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-all">
            <ListChecks className="w-4 h-4" /> Bulk Entry
          </Link>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark transition-all">
            <Plus className="w-4 h-4" /> Add Result
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={filterStudent ? filterStudent.full_name : filterQuery}
            onChange={(e) => { setFilterStudent(null); searchStudents(e.target.value, true); }}
            placeholder="Filter by student name or mobile..."
            className={`${inputClass} pl-9`}
          />
          {filterStudent && (
            <button onClick={() => { setFilterStudent(null); setFilterQuery(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
          {!filterStudent && filterResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden">
              {filterResults.map(u => (
                <button key={u.id} onClick={() => { setFilterStudent(u); setFilterQuery(""); setFilterResults([]); }} className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors">
                  <span className="font-medium">{u.full_name}</span> <span className="text-muted-foreground">· {u.mobile}{u.student_class ? ` · Class ${u.student_class}` : ""}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <BatchFilterSelect batches={batches} value={selectedBatchId} onChange={setSelectedBatchId} isTeacherPortal={isTeacherPortal} />
      </div>

      {/* Results table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-3">No results found</p>
            <button onClick={() => { resetForm(); setShowForm(true); }} className="text-sm text-primary font-medium hover:underline">Add first result</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Student</th>
                  <th className="text-left px-4 py-3 font-medium">Subject</th>
                  <th className="text-left px-4 py-3 font-medium">Exam</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-right px-4 py-3 font-medium">Marks</th>
                  <th className="text-right px-4 py-3 font-medium">%</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {results.map(r => (
                  <tr key={r.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{r.student_name}</div>
                      {r.student_class && <div className="text-xs text-muted-foreground">Class {r.student_class}</div>}
                    </td>
                    <td className="px-4 py-3">{subjectLabel(r.subject)}</td>
                    <td className="px-4 py-3">{r.exam_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.exam_date}</td>
                    <td className="px-4 py-3 text-right">{r.absent ? "—" : `${r.marks_obtained}/${r.marks_total}`}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${r.absent ? "text-muted-foreground" : percentColor(r.percentage)}`}>{r.absent ? "Absent" : `${r.percentage.toFixed(1)}%`}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setShowDelete(r)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={resetForm}>
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h3 className="font-semibold text-foreground">{editingId ? "Edit" : "Add"} Result</h3>
              <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Student *</label>
                {selectedStudent ? (
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-secondary text-sm">
                    <span>{selectedStudent.full_name} · {selectedStudent.mobile}{selectedStudent.student_class ? ` · Class ${selectedStudent.student_class}` : ""}</span>
                    {!editingId && (
                      <button onClick={() => { setSelectedStudent(null); setForm({ ...form, user_id: 0 }); }} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={studentQuery}
                      onChange={(e) => searchStudents(e.target.value, false)}
                      placeholder="Search by name or mobile..."
                      className={inputClass}
                    />
                    {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
                    {studentResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                        {studentResults.map(u => (
                          <button key={u.id} onClick={() => { setSelectedStudent(u); setForm({ ...form, user_id: u.id }); setStudentQuery(""); setStudentResults([]); }} className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors">
                            <span className="font-medium">{u.full_name}</span> <span className="text-muted-foreground">· {u.mobile}{u.student_class ? ` · Class ${u.student_class}` : ""}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Subject *</label>
                  <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={`${inputClass} pr-10 appearance-none bg-no-repeat bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b7280%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22></polyline></svg>)] bg-[position:right_0.75rem_center]`}>
                    {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Exam Date *</label>
                  <input type="date" value={form.exam_date} onChange={(e) => setForm({ ...form, exam_date: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Exam Name *</label>
                <input type="text" value={form.exam_name} onChange={(e) => setForm({ ...form, exam_name: e.target.value })} placeholder="e.g. Weekly Test 3" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Marks Obtained *</label>
                  <input type="number" min={0} value={form.marks_obtained} onChange={(e) => setForm({ ...form, marks_obtained: Number(e.target.value) })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Total Marks *</label>
                  <input type="number" min={1} value={form.marks_total} onChange={(e) => setForm({ ...form, marks_total: Number(e.target.value) })} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Remarks</label>
                <textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} rows={2} placeholder="Optional note for the guardian" className={`${inputClass} resize-none`} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={resetForm} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-all">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId ? "Update" : "Add"}
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
              <h3 className="font-semibold text-foreground">Delete Result</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted-foreground">Delete <strong className="text-foreground">{showDelete.student_name}</strong>&apos;s {subjectLabel(showDelete.subject)} result for &quot;{showDelete.exam_name}&quot;? This cannot be undone.</p>
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
