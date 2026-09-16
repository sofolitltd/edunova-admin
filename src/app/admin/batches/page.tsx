"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getToken, isAuthenticated } from "@/lib/auth";
import { batchApi, academicManagementApi, type Batch, type ClassItem } from "@/lib/api";
import { Plus, Edit, Trash2, X, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";

const DAYS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
const SHIFTS = ["Morning", "Day", "Evening", "Weekend"];
const TYPES = ["Regular", "Exam", "Revision", "Special"];
const SECTIONS = ["A", "B", "C", "D"];
const REGULAR_TYPE = "Regular";
const REGULAR_DAYS = DAYS.filter((d) => d !== "Fri");
const NON_REGULAR_SHIFT = "None";
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

// Batch code = YY + CC + Type + Shift + Section, always 7 digits. Shift is
// "0" for non-Regular types since they don't run parallel shifts. This is
// what differentiates otherwise-identical batches now — the admin picks a
// Section instead of the old auto-scanned suffix letter.
const TYPE_CODES: Record<string, string> = { Regular: "1", Exam: "2", Revision: "3", Special: "4" };
const SHIFT_CODES: Record<string, string> = { Morning: "1", Day: "2", Evening: "3", Weekend: "4" };
const SECTION_CODES: Record<string, string> = { A: "1", B: "2", C: "3", D: "4" };

function getClassCode(classLevel: string, classes: ClassItem[]): string {
  return classes.find((c) => c.name === classLevel)?.code || "";
}

function generateBatchCode(classCode: string, shift: string, typeVal: string, year: number, section: string): string {
  const typeDigit = TYPE_CODES[typeVal];
  const shiftDigit = typeVal === REGULAR_TYPE ? SHIFT_CODES[shift] : "0";
  const sectionDigit = SECTION_CODES[section];
  if (!classCode || !typeDigit || !shiftDigit || !sectionDigit) return "";
  const yearShort = String(year).slice(-2);
  return `${yearShort}${classCode}${typeDigit}${shiftDigit}${sectionDigit}`;
}

function generateBatchName(shift: string, classLevel: string, typeVal: string, year: number, section: string, code: string): string {
  if (!code) return "";
  const label = typeVal === REGULAR_TYPE ? `${shift} Shift` : `${typeVal} Batch`;
  return `${classLevel} ${label} ${year}(${section}) - ${code}`;
}

export default function BatchesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedShift, setSelectedShift] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedYearFilter, setSelectedYearFilter] = useState<number>(0);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ class_level: "", shift: "", type: REGULAR_TYPE, name: "", code: "", section: "", year: currentYear, days: REGULAR_DAYS as string[], start_time: "", end_time: "", max_students: 0, status: "active", admission_fee: 0, note_fee: 0, monthly_fee: 0 });
  const [saving, setSaving] = useState(false);
  const [nameChecking, setNameChecking] = useState(false);
  const [nameError, setNameError] = useState("");
  const [classCodeMissing, setClassCodeMissing] = useState(false);

  const [showDelete, setShowDelete] = useState<Batch | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/admin/login"); return; }
    const tok = getToken();
    if (!tok) return;
    academicManagementApi.getClasses(tok).then(r => setClasses(r)).catch(() => {});
  }, [router]);

  const loadBatches = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const data = await batchApi.getBatches(token, undefined, selectedClass || undefined, selectedShift || undefined, selectedType || undefined, selectedYearFilter || undefined);
      setBatches(data);
    } catch {
      toast.error("Failed to load batches");
    } finally {
      setLoading(false);
    }
  }, [selectedClass, selectedShift, selectedType, selectedYearFilter]);

  useEffect(() => {
    void Promise.resolve().then(() => loadBatches());
  }, [loadBatches]);

  useEffect(() => {
    if (!form.class_level || !form.type || !form.year || !form.section) {
      setClassCodeMissing(false);
      return;
    }
    const classCode = getClassCode(form.class_level, classes);
    if (!classCode) {
      setClassCodeMissing(true);
      setForm((prev) => ({ ...prev, code: "", name: "" }));
      return;
    }
    if (form.type === REGULAR_TYPE && !form.shift) {
      setClassCodeMissing(false);
      return;
    }
    setClassCodeMissing(false);
    const code = generateBatchCode(classCode, form.shift, form.type, form.year, form.section);
    const name = generateBatchName(form.shift, form.class_level, form.type, form.year, form.section, code);
    setForm((prev) => (prev.code === code && prev.name === name ? prev : { ...prev, code, name }));
  }, [form.shift, form.class_level, form.type, form.year, form.section, classes]);

  const resetForm = () => {
    setForm({ class_level: "", shift: "", type: REGULAR_TYPE, name: "", code: "", section: "", year: currentYear, days: REGULAR_DAYS, start_time: "", end_time: "", max_students: 0, status: "active", admission_fee: 0, note_fee: 0, monthly_fee: 0 });
    setEditingId(null);
    setNameError("");
    setNameChecking(false);
    setClassCodeMissing(false);
    setShowForm(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (b: Batch) => {
    const batchType = b.type || REGULAR_TYPE;
    setEditingId(b.id);
    setForm({ class_level: b.class_level || "", shift: b.shift || (batchType === REGULAR_TYPE ? "" : NON_REGULAR_SHIFT), type: batchType, name: b.name, code: b.code || "", section: b.section || "", year: b.year || currentYear, days: b.days || [], start_time: b.start_time, end_time: b.end_time, max_students: b.max_students, status: b.status, admission_fee: b.admission_fee || 0, note_fee: b.note_fee || 0, monthly_fee: b.monthly_fee || 0 });
    setNameError("");
    setShowForm(true);
  };

  const toggleDay = (day: string) => {
    setForm((f) => ({ ...f, days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day] }));
  };

  const handleTypeChange = (type: string) => {
    setNameError("");
    setForm((prev) => ({
      ...prev,
      type,
      shift: type === REGULAR_TYPE ? (prev.shift === NON_REGULAR_SHIFT ? "" : prev.shift) : NON_REGULAR_SHIFT,
      days: type === REGULAR_TYPE ? REGULAR_DAYS : [],
    }));
  };

  const handleShiftChange = (shift: string) => {
    setNameError("");
    setForm((prev) => ({ ...prev, shift }));
  };

  const handleClassChange = (classLevel: string) => {
    setNameError("");
    setForm((prev) => ({ ...prev, class_level: classLevel }));
  };

  const handleSectionChange = (section: string) => {
    setNameError("");
    setForm((prev) => ({ ...prev, section }));
  };

  const handleYearChange = (year: number) => {
    setNameError("");
    setForm((prev) => ({ ...prev, year }));
  };

  const handleSave = async () => {
    const batchName = form.name.trim();
    if (!form.class_level) { toast.error("Please select a class"); return; }
    if (!form.section) { toast.error("Please select a section"); return; }
    if (form.type === REGULAR_TYPE && !form.shift) { toast.error("Please select a shift"); return; }
    if (!form.code || !batchName) { toast.error("Batch code could not be generated — check the class has a code set"); return; }
    const token = getToken();
    if (!token) return;
    setSaving(true);
    setNameChecking(true);
    setNameError("");
    try {
      const [nameCheck, codeCheck] = await Promise.all([
        batchApi.checkBatchName(token, batchName, editingId ?? undefined),
        batchApi.checkBatchCode(token, form.code, editingId ?? undefined),
      ]);
      if (!nameCheck.available) {
        const message = "Batch name already exists";
        setNameError(message);
        toast.error(message);
        return;
      }
      if (!codeCheck.available) {
        const message = "A batch with this exact class/type/shift/section/year already exists — pick a different section";
        setNameError(message);
        toast.error(message);
        return;
      }
      if (editingId) {
        await batchApi.updateBatch(token, editingId, { ...form, name: batchName });
        toast.success("Batch updated");
      } else {
        await batchApi.createBatch(token, { ...form, name: batchName });
        toast.success("Batch created");
      }
      resetForm();
      loadBatches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setNameChecking(false);
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      await batchApi.deleteBatch(token, showDelete.id);
      toast.success("Batch deleted");
      setShowDelete(null);
      loadBatches();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
  const formSelectCls = "w-full px-3 py-2.5 pr-10 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none bg-no-repeat bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b7280%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22></polyline></svg>)] bg-[position:right_0.75rem_center]";
  const filterSelectCls = "px-4 py-2.5 pr-10 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[200px] appearance-none bg-no-repeat bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b7280%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22></polyline></svg>)] bg-[position:right_0.75rem_center]";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Batches</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage course batches and schedules</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Batch
        </button>
      </div>

      {/* Class & Shift Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className={filterSelectCls}
        >
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <select
          value={selectedShift}
          onChange={(e) => setSelectedShift(e.target.value)}
          className={filterSelectCls}
        >
          <option value="">All Shifts</option>
          {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className={filterSelectCls}
        >
          <option value="">All Types</option>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={selectedYearFilter}
          onChange={(e) => setSelectedYearFilter(e.target.value ? Number(e.target.value) : 0)}
          className={filterSelectCls}
        >
          <option value="0">All Years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Batch Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">Loading...</div>
        ) : batches.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-3">No batches found</p>
            <button onClick={openCreate} className="text-sm text-primary font-medium hover:underline">Create first batch</button>
          </div>
        ) : (
          batches.map((b) => (
            <div
              key={b.id}
              onClick={() => router.push(`/admin/batches/${b.code || b.id}`)}
              className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">{b.name}</h3>
                  {b.code && (
                    <span className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">{b.code}</span>
                  )}
                  {/* <p className="text-xs text-muted-foreground mt-0.5">{b.class_level}</p>
                  <p className="text-xs text-muted-foreground">{b.shift || "No shift"}</p>
                  {b.type && <p className="text-xs text-muted-foreground">{b.type}</p>} */}
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  b.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                }`}>
                  {b.status}
                </span>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex  gap-2 text-sm text-muted-foreground">
                  <span className="font-medium ">Schedule:</span> 
                  {b.schedule || "Not set"}
                  
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-medium">Max Students:</span> {b.max_students > 0 ? b.max_students : "Unlimited"}
                </div>
                {(b.admission_fee || b.note_fee || b.monthly_fee) && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {b.admission_fee > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        Admission: ৳{b.admission_fee}
                      </span>
                    )}
                    {b.note_fee > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        Note: ৳{b.note_fee}
                      </span>
                    )}
                    {b.monthly_fee > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        Monthly: ৳{b.monthly_fee}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-border">
                <button
                  onClick={(e) => { e.stopPropagation(); openEdit(b); }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-all"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowDelete(b); }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={resetForm}>
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h3 className="font-semibold text-foreground">{editingId ? "Edit" : "Create"} Batch</h3>
              <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Type *</label>
                  <select
                    value={form.type}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className={formSelectCls}
                  >
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Shift *
                    {form.type !== REGULAR_TYPE && (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">(Not applicable)</span>
                    )}
                  </label>
                  <select
                    value={form.shift}
                    disabled={form.type !== REGULAR_TYPE}
                    onChange={(e) => handleShiftChange(e.target.value)}
                    className={`${formSelectCls} ${form.type !== REGULAR_TYPE ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    {form.type === REGULAR_TYPE ? (
                      <>
                        <option value="">Select Shift</option>
                        {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </>
                    ) : (
                      <option value={NON_REGULAR_SHIFT}>None</option>
                    )}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Class *</label>
                  <select
                    value={form.class_level}
                    onChange={(e) => handleClassChange(e.target.value)}
                    className={formSelectCls}
                  >
                    <option value="">Select Class</option>
                    {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Section *</label>
                  <select
                    value={form.section}
                    onChange={(e) => handleSectionChange(e.target.value)}
                    className={formSelectCls}
                  >
                    <option value="">Select</option>
                    {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Year *</label>
                  <select
                    value={form.year}
                    onChange={(e) => handleYearChange(Number(e.target.value))}
                    className={formSelectCls}
                  >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              {classCodeMissing && (
                <p className="text-xs text-destructive">This class has no numeric code set — add one in Academic Management first.</p>
              )}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Batch Code</label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.code}
                    readOnly
                    placeholder="Auto-generated from class/type/shift/section/year"
                    className="w-full px-3 py-2.5 pr-10 rounded-xl bg-secondary/60 border-0 text-sm text-foreground placeholder:text-muted-foreground cursor-not-allowed"
                  />
                  {nameChecking && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Batch Name</label>
                <input
                  type="text"
                  value={form.name}
                  readOnly
                  placeholder="Auto-generated"
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary/60 border-0 text-sm text-foreground placeholder:text-muted-foreground cursor-not-allowed"
                />
                {nameChecking && <p className="mt-1 text-xs text-primary">Checking availability...</p>}
                {nameError && <p className="mt-1 text-xs text-destructive">{nameError}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Days</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        form.days.includes(day)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary text-secondary-foreground border-transparent hover:bg-secondary/80"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Start Time</label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">End Time</label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Max Students</label>
                  <input
                    type="number"
                    value={form.max_students || ""}
                    onChange={(e) => setForm({ ...form, max_students: Number(e.target.value) })}
                    placeholder="0 = unlimited"
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className={formSelectCls}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Admission Fee (৳)</label>
                  <input
                    type="number"
                    value={form.admission_fee || ""}
                    onChange={(e) => setForm({ ...form, admission_fee: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Note Fee (৳)</label>
                  <input
                    type="number"
                    value={form.note_fee || ""}
                    onChange={(e) => setForm({ ...form, note_fee: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Monthly Fee (৳)</label>
                  <input
                    type="number"
                    value={form.monthly_fee || ""}
                    onChange={(e) => setForm({ ...form, monthly_fee: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
              <button onClick={resetForm} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving || nameChecking || !form.code || !form.name.trim() || !form.class_level || !form.section || (form.type === REGULAR_TYPE && !form.shift)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDelete(null)}>
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Delete Batch</h3>
              <button onClick={() => setShowDelete(null)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted-foreground">
                Delete <strong className="text-foreground">{showDelete.name}</strong> ({showDelete.class_level} {showDelete.shift || ""})? Students in this batch will be unassigned.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowDelete(null)} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive text-white text-sm font-medium hover:bg-destructive/90 disabled:opacity-50 transition-all"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
