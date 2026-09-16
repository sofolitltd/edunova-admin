"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  api,
  questionsApi,
  examsApi,
  type Exam,
  type Course,
  type ExamQuestion,
  type CreateExamPayload,
  type ExamQuestionPayload,
  type Question,
} from "@/lib/api";
import { getToken, getLoginPath } from "@/lib/auth";
import { useBatchFilter } from "@/hooks/useBatchFilter";
import { BatchFilterSelect } from "@/components/BatchFilterSelect";
import {
  Plus,
  Pencil,
  Trash2,
  FileText,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Search,
  Check,
  Radio,
} from "lucide-react";
import { toast } from "sonner";

const defaultExamForm = {
  title: "",
  course_id: 0,
  batch_id: 0,
  date: "",
  time: "",
  duration: "",
};

const defaultQuestion: ExamQuestionPayload = {
  question_text: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_option: 1,
};

export default function ExamsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { isTeacherPortal, batches, selectedBatchId, setSelectedBatchId, batchIdNum } = useBatchFilter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [examForm, setExamForm] = useState(defaultExamForm);
  const [questions, setQuestions] = useState<ExamQuestionPayload[]>([]);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);

  // Question bank selector
  const [showQuestionBank, setShowQuestionBank] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
  const [bankSearch, setBankSearch] = useState("");
  const [bankLoading, setBankLoading] = useState(false);
  const [selectedBankIds, setSelectedBankIds] = useState<Set<number>>(new Set());

  const fetchData = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.push(getLoginPath(pathname));
      return;
    }
    try {
      const [examsData, coursesData] = await Promise.all([
        api.getExams(token, batchIdNum),
        api.getCourses(token),
      ]);
      setExams(examsData);
      setCourses(coursesData);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [router, pathname, batchIdNum]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setEditingId(null);
    setExamForm({ ...defaultExamForm, batch_id: isTeacherPortal && batches.length === 1 ? batches[0].id : 0 });
    setQuestions([]);
    setShowModal(true);
  };

  const toggleLive = async (exam: Exam) => {
    const token = getToken();
    if (!token) return;
    try {
      const newState = !exam.is_live;
      await examsApi.toggleLive(token, exam.id, newState);
      toast.success(newState ? "Exam is now LIVE" : "Exam stopped");
      fetchData();
    } catch {
      toast.error("Failed to toggle live");
    }
  };

  const openEdit = async (exam: Exam) => {
    const token = getToken();
    if (!token) return;
    try {
      const qs = await api.getExamQuestions(token, exam.id);
      setEditingId(exam.id);
      setExamForm({
        title: exam.title,
        course_id: exam.course_id,
        batch_id: exam.batch_id || 0,
        date: exam.date,
        time: exam.time,
        duration: exam.duration,
      });
      setQuestions(
        qs.map((q) => ({
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_option: q.correct_option,
        }))
      );
      setShowModal(true);
    } catch {
      toast.error("Failed to load questions");
    }
  };

  const toggleExpand = async (exam: Exam) => {
    if (expandedId === exam.id) {
      setExpandedId(null);
      setExamQuestions([]);
      return;
    }
    const token = getToken();
    if (!token) return;
    try {
      const qs = await api.getExamQuestions(token, exam.id);
      setExamQuestions(qs);
      setExpandedId(exam.id);
    } catch {
      toast.error("Failed to load questions");
    }
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, { ...defaultQuestion }]);
  };

  const updateQuestion = (index: number, field: string, value: string | number) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, [field]: value } : q))
    );
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const openQuestionBank = async () => {
    setShowQuestionBank(true);
    setSelectedBankIds(new Set());
    setBankSearch("");
    setBankLoading(true);
    try {
      const token = getToken();
      if (!token) return;
      const res = await questionsApi.getQuestions(token, { per_page: 100, status: "published" });
      setBankQuestions(res.questions);
    } catch {
      toast.error("Failed to load question bank");
    } finally {
      setBankLoading(false);
    }
  };

  const toggleBankSelection = (id: number) => {
    setSelectedBankIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addSelectedFromBank = () => {
    const selected = bankQuestions.filter((q) => selectedBankIds.has(q.id));
    const converted: ExamQuestionPayload[] = selected.map((q) => {
      let optionA = "", optionB = "", optionC = "", optionD = "", correctOption = 1;
      if (q.options) {
        try {
          const opts = JSON.parse(q.options) as { label: string; text: string }[];
          optionA = opts[0]?.text || "";
          optionB = opts[1]?.text || "";
          optionC = opts[2]?.text || "";
          optionD = opts[3]?.text || "";
        } catch {}
      }
      const answerUpper = (q.answer || "").toUpperCase().trim();
      if (answerUpper === "A") correctOption = 1;
      else if (answerUpper === "B") correctOption = 2;
      else if (answerUpper === "C") correctOption = 3;
      else if (answerUpper === "D") correctOption = 4;
      return {
        question_text: q.question_text,
        option_a: optionA,
        option_b: optionB,
        option_c: optionC,
        option_d: optionD,
        correct_option: correctOption,
      };
    });
    setQuestions((prev) => [...prev, ...converted]);
    setShowQuestionBank(false);
    toast.success(`Added ${converted.length} questions from question bank`);
  };

  const filteredBankQuestions = bankQuestions.filter((q) =>
    !bankSearch || q.question_text.toLowerCase().includes(bankSearch.toLowerCase()) ||
    (q.class_name || "").toLowerCase().includes(bankSearch.toLowerCase()) ||
    (q.subject_name || "").toLowerCase().includes(bankSearch.toLowerCase())
  );

  const handleSave = async () => {
    if (!examForm.title || !examForm.course_id || !examForm.date || !examForm.time || !examForm.duration) {
      toast.error("All exam fields are required");
      return;
    }
    if (isTeacherPortal && !examForm.batch_id) {
      toast.error("Please select a batch");
      return;
    }
    if (questions.length === 0) {
      toast.error("Add at least one question");
      return;
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text || !q.option_a || !q.option_b || !q.option_c || !q.option_d) {
        toast.error(`Question ${i + 1}: all fields are required`);
        return;
      }
    }
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      const payload: CreateExamPayload = {
        ...examForm,
        course_id: Number(examForm.course_id),
        questions,
      };
      if (editingId) {
        const updated = await api.updateExam(token, editingId, payload);
        setExams((prev) =>
          prev.map((e) => (e.id === editingId ? updated : e))
        );
        toast.success("Exam updated");
      } else {
        const created = await api.createExam(token, payload);
        setExams((prev) => [created, ...prev]);
        toast.success("Exam created");
      }
      setShowModal(false);
    } catch {
      toast.error("Failed to save exam");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Delete exam "${title}"? This cannot be undone.`)) return;
    const token = getToken();
    if (!token) return;
    try {
      await api.deleteExam(token, id);
      setExams((prev) => prev.filter((e) => e.id !== id));
      toast.success("Exam deleted");
    } catch {
      toast.error("Failed to delete exam");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Exams</h1>
          <p className="text-muted-foreground mt-1">Manage exams and questions</p>
        </div>
        <div className="flex items-center gap-3">
          <BatchFilterSelect batches={batches} value={selectedBatchId} onChange={setSelectedBatchId} isTeacherPortal={isTeacherPortal} />
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold text-sm shadow-primary hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Exam
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center shadow-sm-custom">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No exams yet. Create your first exam.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="bg-card rounded-2xl border border-border shadow-sm-custom overflow-hidden"
            >
              <div className="flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{exam.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {exam.course_name} · {exam.date} · {exam.time} · {exam.duration}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
                    {exam.total_questions} Q
                  </span>
                  {exam.is_live && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-bold animate-pulse">
                      <Radio className="w-3 h-3" /> LIVE
                    </span>
                  )}
                  <button
                    onClick={() => toggleLive(exam)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      exam.is_live
                        ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                        : "bg-success/10 text-success hover:bg-success/20"
                    }`}
                  >
                    {exam.is_live ? "Stop Live" : "Go Live"}
                  </button>
                  <button
                    onClick={() => toggleExpand(exam)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    {expandedId === exam.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => openEdit(exam)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(exam.id, exam.title)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expanded Questions */}
              {expandedId === exam.id && (
                <div className="border-t border-border bg-secondary/30 p-5">
                  {examQuestions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No questions yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {examQuestions.map((q, idx) => (
                        <div
                          key={q.id}
                          className="bg-card rounded-xl border border-border p-4"
                        >
                          <div className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {q.question_text}
                              </p>
                              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                {[
                                  { label: "A", value: q.option_a },
                                  { label: "B", value: q.option_b },
                                  { label: "C", value: q.option_c },
                                  { label: "D", value: q.option_d },
                                ].map((opt) => (
                                  <div
                                    key={opt.label}
                                    className={`px-3 py-2 rounded-lg ${
                                      q.correct_option === opt.label.charCodeAt(0) - 64
                                        ? "bg-success/10 text-success font-medium"
                                        : "bg-secondary text-muted-foreground"
                                    }`}
                                  >
                                    {opt.label}. {opt.value}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl bg-card rounded-2xl border border-border shadow-lg-custom max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">
                {editingId ? "Edit Exam" : "Create Exam"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Exam Info */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Title *
                </label>
                <input
                  value={examForm.title}
                  onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g. Mid-term Exam"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Course *
                </label>
                <select
                  value={examForm.course_id}
                  onChange={(e) => setExamForm({ ...examForm, course_id: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value={0}>Select course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Batch{isTeacherPortal ? " *" : ""}
                </label>
                <select
                  value={examForm.batch_id}
                  onChange={(e) => setExamForm({ ...examForm, batch_id: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value={0}>{isTeacherPortal ? "Select batch" : "No specific batch"}</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>{b.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Date *
                  </label>
                  <input
                    value={examForm.date}
                    onChange={(e) => setExamForm({ ...examForm, date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g. 2026-09-20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Time *
                  </label>
                  <input
                    value={examForm.time}
                    onChange={(e) => setExamForm({ ...examForm, time: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g. 10:00 AM"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Duration *
                  </label>
                  <input
                    value={examForm.duration}
                    onChange={(e) => setExamForm({ ...examForm, duration: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g. 60 min"
                  />
                </div>
              </div>

              {/* Questions */}
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    Questions ({questions.length})
                  </h3>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={openQuestionBank}
                      className="text-xs font-medium text-secondary-foreground bg-secondary hover:bg-secondary/80 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      + From Question Bank
                    </button>
                    <button
                      onClick={addQuestion}
                      className="text-xs font-medium text-primary hover:text-primary-dark transition-colors"
                    >
                      + Add Question
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  {questions.map((q, idx) => (
                    <div
                      key={idx}
                      className="bg-background rounded-xl border border-border p-4 space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-2">
                          {idx + 1}
                        </span>
                        <div className="flex-1 space-y-3">
                          <input
                            value={q.question_text}
                            onChange={(e) =>
                              updateQuestion(idx, "question_text", e.target.value)
                            }
                            className="w-full px-4 py-2.5 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                            placeholder="Question text"
                          />
                          <div className="grid grid-cols-2 gap-3">
                            {(["option_a", "option_b", "option_c", "option_d"] as const).map(
                              (opt, oi) => (
                                <div key={opt} className="flex items-center gap-2">
                                  <button
                                    onClick={() =>
                                      updateQuestion(idx, "correct_option", oi + 1)
                                    }
                                    className={`w-7 h-7 rounded-lg text-xs font-bold shrink-0 transition-all ${
                                      q.correct_option === oi + 1
                                        ? "bg-success text-white"
                                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                                    }`}
                                  >
                                    {String.fromCharCode(65 + oi)}
                                  </button>
                                  <input
                                    value={q[opt]}
                                    onChange={(e) =>
                                      updateQuestion(idx, opt, e.target.value)
                                    }
                                    className="w-full px-3 py-2 rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                    placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                  />
                                </div>
                              )
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeQuestion(idx)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {questions.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No questions added. Click &quot;Add Question&quot; to start.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-semibold shadow-primary hover:shadow-lg disabled:opacity-50 flex items-center gap-2 transition-all"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question Bank Selector Modal */}
      {showQuestionBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl bg-card rounded-2xl border border-border shadow-lg-custom max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Select from Question Bank</h2>
              <button onClick={() => setShowQuestionBank(false)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {selectedBankIds.size} selected · {filteredBankQuestions.length} questions shown
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {bankLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filteredBankQuestions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No questions found</p>
              ) : (
                filteredBankQuestions.map((q) => (
                  <div
                    key={q.id}
                    onClick={() => toggleBankSelection(q.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedBankIds.has(q.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-secondary/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        selectedBankIds.has(q.id) ? "border-primary bg-primary" : "border-border"
                      }`}>
                        {selectedBankIds.has(q.id) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground line-clamp-2">{q.question_text}</p>
                        <div className="flex gap-2 mt-1">
                          {q.class_name && <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">{q.class_name}</span>}
                          {q.subject_name && <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">{q.subject_name}</span>}
                          <span className="text-xs text-muted-foreground">{q.difficulty}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
              <button
                onClick={() => setShowQuestionBank(false)}
                className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addSelectedFromBank}
                disabled={selectedBankIds.size === 0}
                className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Add {selectedBankIds.size} Questions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
