"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, usePathname, useSearchParams } from "next/navigation";
import { getToken, isAuthenticated, getLoginPath } from "@/lib/auth";
import {
  api,
  examsApi,
  questionsApi,
  academicManagementApi,
  type Exam,
  type Course,
  type ExamQuestion,
  type ExamQuestionPayload,
  type ClassItem,
  type Subject,
  type Book,
  type Chapter,
  type Topic,
} from "@/lib/api";
import {
  ArrowLeft,
  Radio,
  Pencil,
  Trash2,
  Plus,
  HelpCircle,
  ListChecks,
  Loader2,
  Download,
  Eye,
  X,
} from "lucide-react";
import { toast } from "sonner";

type Tab = "overview" | "questions";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "questions", label: "Questions", icon: <HelpCircle className="w-3.5 h-3.5" /> },
  { key: "overview", label: "Overview", icon: <ListChecks className="w-3.5 h-3.5" /> },
];

const defaultQuestion: ExamQuestionPayload = {
  question_text: "",
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  correct_option: 1,
};

const defaultExamForm = {
  title: "",
  course_id: 0,
  batch_id: 0,
  date: "",
  time: "",
  duration: "",
  total_marks: 0,
};

async function buildExamPdf(exam: Exam, questions: ExamQuestion[], includeAnswers: boolean) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const centerX = pageWidth / 2;

  doc.setFont("times", "bold");
  doc.setFontSize(18);
  doc.text(exam.title, centerX, y, { align: "center" });
  y += 22;

  if (exam.batch_name) {
    doc.setFont("times", "normal");
    doc.setFontSize(12);
    doc.text(exam.batch_name, centerX, y, { align: "center" });
    y += 18;
  }

  if (includeAnswers) {
    doc.setFont("times", "bold");
    doc.setFontSize(10);
    doc.setTextColor(16, 122, 68);
    doc.text("ANSWER KEY", centerX, y, { align: "center" });
    doc.setTextColor(0, 0, 0);
    y += 16;
  }

  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.text(`Duration: ${exam.duration}`, margin, y);
  doc.text(`Marks: ${exam.total_marks}`, pageWidth - margin, y, { align: "right" });
  y += 12;
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  const maxWidth = pageWidth - margin * 2;
  questions.forEach((q, idx) => {
    ensureSpace(60);
    doc.setFont("times", "bold");
    doc.setFontSize(12);
    const qLines = doc.splitTextToSize(`${idx + 1}. ${q.question_text}`, maxWidth);
    doc.text(qLines, margin, y);
    y += qLines.length * 15 + 4;

    doc.setFont("times", "normal");
    doc.setFontSize(11);
    const options: [string, string, number][] = [
      ["A", q.option_a, 1],
      ["B", q.option_b, 2],
      ["C", q.option_c, 3],
      ["D", q.option_d, 4],
    ];
    options.forEach(([label, text, val]) => {
      ensureSpace(16);
      const isCorrect = includeAnswers && val === q.correct_option;
      const optLines = doc.splitTextToSize(`${label}. ${text}${isCorrect ? "  (correct)" : ""}`, maxWidth - 16);
      if (isCorrect) doc.setTextColor(16, 122, 68);
      doc.text(optLines, margin + 16, y);
      if (isCorrect) doc.setTextColor(0, 0, 0);
      y += optLines.length * 13 + 2;
    });
    y += 12;
  });

  return doc;
}

export default function ExamDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const examId = Number(params.id);
  const portalBase = pathname.startsWith("/teacher") ? "/teacher" : "/admin";

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const t = searchParams.get("tab");
    return TABS.some((x) => x.key === t) ? (t as Tab) : "questions";
  });
  const handleTabChange = (key: Tab) => {
    setActiveTab(key);
    router.replace(`${portalBase}/exams/${examId}?tab=${key}`, { scroll: false });
  };

  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<Exam | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  const [editingInfo, setEditingInfo] = useState(false);
  const [examForm, setExamForm] = useState(defaultExamForm);
  const [savingInfo, setSavingInfo] = useState(false);
  const [togglingLive, setTogglingLive] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState<ExamQuestionPayload>({ ...defaultQuestion });
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [deletingQId, setDeletingQId] = useState<number | null>(null);

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [classId, setClassId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [bookId, setBookId] = useState<number | null>(null);
  const [chapterId, setChapterId] = useState<number | null>(null);
  const [topicId, setTopicId] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState("medium");
  const [marks, setMarks] = useState(1);
  const [explanation, setExplanation] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [source, setSource] = useState("");
  const [language, setLanguage] = useState("bn");

  const resetManualForm = () => {
    setNewQuestion({ ...defaultQuestion });
    setClassId(null);
    setSubjectId(null);
    setBookId(null);
    setChapterId(null);
    setTopicId(null);
    setDifficulty("medium");
    setMarks(1);
    setExplanation("");
    setTags([]);
    setTagInput("");
    setSource("");
    setLanguage("bn");
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [includeAnswers, setIncludeAnswers] = useState(false);

  const loadQuestions = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setQuestionsLoading(true);
    try {
      const qs = await api.getExamQuestions(token, examId);
      setQuestions(qs);
    } catch {
      toast.error("Failed to load questions");
    } finally {
      setQuestionsLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    if (!isAuthenticated()) { router.push(getLoginPath(pathname)); return; }
    const token = getToken();
    if (!token || !examId) return;

    const load = async () => {
      setLoading(true);
      try {
        const [exams, coursesData, classesData, subjectsData] = await Promise.all([
          api.getExams(token),
          api.getCourses(token),
          academicManagementApi.getClasses(token),
          academicManagementApi.getSubjects(token),
        ]);
        const found = exams.find((e) => e.id === examId) ?? null;
        setExam(found);
        setCourses(coursesData);
        setClasses(classesData);
        setSubjects(subjectsData);
        if (!found) {
          toast.error("Exam not found");
          return;
        }
        await loadQuestions();
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [examId, router, pathname, loadQuestions]);

  useEffect(() => {
    const token = getToken();
    if (!token || !classId || !subjectId) { setBooks([]); setBookId(null); return; }
    academicManagementApi.getBooks(token, subjectId, classId).then(setBooks).catch(() => {});
    setBookId(null);
    setChapters([]);
    setChapterId(null);
    setTopics([]);
    setTopicId(null);
  }, [classId, subjectId]);

  useEffect(() => {
    const token = getToken();
    if (!token || !bookId) { setChapters([]); setChapterId(null); return; }
    academicManagementApi.getChapters(token, bookId).then(setChapters).catch(() => {});
    setChapterId(null);
    setTopics([]);
    setTopicId(null);
  }, [bookId]);

  useEffect(() => {
    const token = getToken();
    if (!token || !chapterId) { setTopics([]); setTopicId(null); return; }
    academicManagementApi.getTopics(token, chapterId).then(setTopics).catch(() => {});
    setTopicId(null);
  }, [chapterId]);

  const openEditInfo = () => {
    if (!exam) return;
    setExamForm({
      title: exam.title,
      course_id: exam.course_id,
      batch_id: exam.batch_id || 0,
      date: exam.date,
      time: exam.time,
      duration: exam.duration,
      total_marks: exam.total_marks || 0,
    });
    setEditingInfo(true);
  };

  const handleSaveInfo = async () => {
    if (!exam) return;
    if (!examForm.title || !examForm.course_id || !examForm.date || !examForm.time || !examForm.duration) {
      toast.error("All exam fields are required");
      return;
    }
    const token = getToken();
    if (!token) return;
    setSavingInfo(true);
    try {
      const updated = await api.updateExam(token, exam.id, {
        ...examForm,
        course_id: Number(examForm.course_id),
        total_marks: Number(examForm.total_marks) || 0,
      });
      setExam(updated);
      toast.success("Exam updated");
      setEditingInfo(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update exam");
    } finally {
      setSavingInfo(false);
    }
  };

  const toggleLive = async () => {
    if (!exam) return;
    const token = getToken();
    if (!token) return;
    setTogglingLive(true);
    try {
      const newState = !exam.is_live;
      await examsApi.toggleLive(token, exam.id, newState);
      setExam({ ...exam, is_live: newState });
      toast.success(newState ? "Exam is now LIVE" : "Exam stopped");
    } catch {
      toast.error("Failed to toggle live");
    } finally {
      setTogglingLive(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!newQuestion.question_text || !newQuestion.option_a || !newQuestion.option_b || !newQuestion.option_c || !newQuestion.option_d) {
      toast.error("All question fields are required");
      return;
    }
    const token = getToken();
    if (!token) return;
    setAddingQuestion(true);
    try {
      const options = [
        { label: "A", text: newQuestion.option_a },
        { label: "B", text: newQuestion.option_b },
        { label: "C", text: newQuestion.option_c },
        { label: "D", text: newQuestion.option_d },
      ];
      const answer = String.fromCharCode(64 + newQuestion.correct_option);

      // Save into the central question bank first, so every question—wherever it's
      // entered from—ends up in one organized, reusable bank.
      await questionsApi.createQuestion(token, {
        class_id: classId,
        subject_id: subjectId,
        book_id: bookId,
        chapter_id: chapterId,
        topic_id: topicId,
        question_type: "mcq",
        question_text: newQuestion.question_text,
        options: JSON.stringify(options),
        answer,
        explanation,
        marks,
        difficulty,
        tags,
        source,
        source_page: null,
        language,
      });

      const q = await api.addExamQuestion(token, examId, newQuestion);
      setQuestions((prev) => [...prev, q]);
      setExam((prev) => (prev ? { ...prev, total_questions: prev.total_questions + 1 } : prev));
      resetManualForm();
      setShowAddForm(false);
      toast.success("Question added to exam and saved to the question bank");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add question");
    } finally {
      setAddingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (qid: number) => {
    if (!confirm("Delete this question?")) return;
    const token = getToken();
    if (!token) return;
    setDeletingQId(qid);
    try {
      await api.deleteExamQuestion(token, examId, qid);
      setQuestions((prev) => prev.filter((q) => q.id !== qid));
      setExam((prev) => (prev ? { ...prev, total_questions: Math.max(0, prev.total_questions - 1) } : prev));
      toast.success("Question deleted");
    } catch {
      toast.error("Failed to delete question");
    } finally {
      setDeletingQId(null);
    }
  };

  const handleDownloadPdf = async () => {
    if (!exam) return;
    setDownloading(true);
    try {
      const doc = await buildExamPdf(exam, questions, includeAnswers);
      const suffix = includeAnswers ? "answer_key" : "questions";
      doc.save(`${exam.title.replace(/[^a-z0-9]+/gi, "_")}_${suffix}.pdf`);
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handlePreviewPdf = async () => {
    if (!exam) return;
    setPreviewing(true);
    try {
      const doc = await buildExamPdf(exam, questions, includeAnswers);
      const url = doc.output("bloburl").toString();
      setPreviewUrl(url);
      setShowPreview(true);
    } catch {
      toast.error("Failed to generate preview");
    } finally {
      setPreviewing(false);
    }
  };

  const closePreview = () => {
    setShowPreview(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const inputClass = "w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";

  if (loading) {
    return <div className="py-24 text-center text-muted-foreground">Loading...</div>;
  }

  if (!exam) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground mb-3">Exam not found</p>
        <button onClick={() => router.push(`${portalBase}/exams`)} className="text-sm text-primary font-medium hover:underline">Back to Exams</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push(`${portalBase}/exams`)}
            className="p-2 rounded-xl hover:bg-secondary text-muted-foreground shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground truncate">{exam.title}</h1>
              {exam.is_live && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-bold animate-pulse">
                  <Radio className="w-3 h-3" /> LIVE
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {exam.course_name} · {exam.date} · {exam.time} · {exam.duration}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:ml-auto sm:shrink-0">
          <div className="inline-flex items-center rounded-lg bg-secondary p-0.5 shrink-0">
            <button
              onClick={() => setIncludeAnswers(false)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                !includeAnswers ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Question Paper
            </button>
            <button
              onClick={() => setIncludeAnswers(true)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                includeAnswers ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Answer Key
            </button>
          </div>
          <button
            onClick={handlePreviewPdf}
            disabled={questions.length === 0 || previewing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
            title={questions.length === 0 ? "Add questions first" : `Preview ${includeAnswers ? "answer key" : "question paper"}`}
          >
            {previewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
            Preview
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={questions.length === 0 || downloading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
            title={questions.length === 0 ? "Add questions first" : `Download ${includeAnswers ? "answer key" : "question paper"} as PDF`}
          >
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Download PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === t.key ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon} {t.label}
            {t.key === "questions" && <span className="ml-0.5 text-xs opacity-80">({exam.total_questions})</span>}
          </button>
        ))}
      </div>
      <div className="border-b border-border" />

      {/* Overview */}
      {activeTab === "overview" && (
        <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Exam Info</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleLive}
                disabled={togglingLive}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${
                  exam.is_live
                    ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                    : "bg-success/10 text-success hover:bg-success/20"
                }`}
              >
                {exam.is_live ? "Stop Live" : "Go Live"}
              </button>
              <button
                onClick={openEditInfo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            </div>
          </div>

          {!editingInfo ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Course</p>
                <p className="text-sm font-medium text-foreground">{exam.course_name || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Batch</p>
                <p className="text-sm font-medium text-foreground">{exam.batch_name || "No specific batch"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm font-medium text-foreground">{exam.date}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Time</p>
                <p className="text-sm font-medium text-foreground">{exam.time}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="text-sm font-medium text-foreground">{exam.duration}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Marks</p>
                <p className="text-sm font-medium text-foreground">{exam.total_marks}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Questions</p>
                <p className="text-sm font-medium text-foreground">{exam.total_questions}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Title *</label>
                <input value={examForm.title} onChange={(e) => setExamForm({ ...examForm, title: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Course *</label>
                <select value={examForm.course_id} onChange={(e) => setExamForm({ ...examForm, course_id: Number(e.target.value) })} className={inputClass}>
                  <option value={0}>Select course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Date *</label>
                  <input type="date" value={examForm.date} onChange={(e) => setExamForm({ ...examForm, date: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Time *</label>
                  <input type="time" value={examForm.time} onChange={(e) => setExamForm({ ...examForm, time: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Duration *</label>
                  <input value={examForm.duration} onChange={(e) => setExamForm({ ...examForm, duration: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Marks</label>
                  <input type="number" min={0} value={examForm.total_marks} onChange={(e) => setExamForm({ ...examForm, total_marks: Number(e.target.value) })} className={inputClass} />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button onClick={() => setEditingInfo(false)} className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSaveInfo}
                  disabled={savingInfo}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-semibold shadow-primary hover:shadow-lg disabled:opacity-50 flex items-center gap-2 transition-all"
                >
                  {savingInfo && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Questions */}
      {activeTab === "questions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => router.push(`${portalBase}/exams/${examId}/question-bank`)}
              className="text-xs font-medium text-secondary-foreground bg-secondary hover:bg-secondary/80 px-3 py-2 rounded-lg transition-colors"
            >
              + From Question Bank
            </button>
            <button
              onClick={() => { resetManualForm(); setShowAddForm(true); }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-primary hover:bg-primary-dark px-3 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Manually
            </button>
          </div>

          {showAddForm && (
            <div className="bg-background rounded-xl border border-border p-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                This also saves the question into the central Question Bank, tagged with the class/subject/chapter you pick below, so it can be reused in other exams later.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <select
                  value={classId ?? ""}
                  onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : null)}
                  className="px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Class</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select
                  value={subjectId ?? ""}
                  onChange={(e) => setSubjectId(e.target.value ? Number(e.target.value) : null)}
                  className="px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Subject</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select
                  value={bookId ?? ""}
                  onChange={(e) => setBookId(e.target.value ? Number(e.target.value) : null)}
                  disabled={!classId || !subjectId}
                  className="px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                >
                  <option value="">Book</option>
                  {books.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <select
                  value={chapterId ?? ""}
                  onChange={(e) => setChapterId(e.target.value ? Number(e.target.value) : null)}
                  disabled={!bookId}
                  className="px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                >
                  <option value="">Chapter</option>
                  {chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select
                  value={topicId ?? ""}
                  onChange={(e) => setTopicId(e.target.value ? Number(e.target.value) : null)}
                  disabled={!chapterId}
                  className="px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                >
                  <option value="">Topic</option>
                  {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <input
                value={newQuestion.question_text}
                onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                className={`${inputClass} text-sm`}
                placeholder="Question text"
              />
              <div className="grid grid-cols-2 gap-3">
                {(["option_a", "option_b", "option_c", "option_d"] as const).map((opt, oi) => (
                  <div key={opt} className="flex items-center gap-2">
                    <button
                      onClick={() => setNewQuestion({ ...newQuestion, correct_option: oi + 1 })}
                      className={`w-7 h-7 rounded-lg text-xs font-bold shrink-0 transition-all ${
                        newQuestion.correct_option === oi + 1 ? "bg-success text-white" : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {String.fromCharCode(65 + oi)}
                    </button>
                    <input
                      value={newQuestion[opt]}
                      onChange={(e) => setNewQuestion({ ...newQuestion, [opt]: e.target.value })}
                      className={`${inputClass} text-sm`}
                      placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                    />
                  </div>
                ))}
              </div>

              <textarea
                rows={2}
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Explanation (optional)"
                className={`${inputClass} text-sm resize-none`}
              />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
                <input
                  type="number"
                  min={1}
                  value={marks}
                  onChange={(e) => setMarks(Number(e.target.value))}
                  placeholder="Marks"
                  className="px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="bn">Bengali</option>
                  <option value="en">English</option>
                </select>
                <input
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="Source (optional)"
                  className="px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <div className="flex gap-2">
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                    placeholder="Add tag..."
                    className="flex-1 px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button onClick={addTag} className="px-3 py-2.5 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm transition-all">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-2">
                    {tags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="hover:text-primary-dark"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3">
                <button onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleAddQuestion}
                  disabled={addingQuestion}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2 transition-all"
                >
                  {addingQuestion && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add Question
                </button>
              </div>
            </div>
          )}

          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {questionsLoading ? (
              <div className="py-12 text-center text-muted-foreground">Loading...</div>
            ) : questions.length === 0 ? (
              <div className="py-12 text-center">
                <HelpCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No questions yet. Add manually or from the question bank.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {questions.map((q, idx) => (
                  <div key={q.id} className="p-5">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{q.question_text}</p>
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
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        disabled={deletingQId === q.id}
                        className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 shrink-0"
                      >
                        {deletingQId === q.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl h-[90vh] bg-card rounded-2xl border border-border shadow-lg-custom flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <h2 className="text-lg font-semibold text-foreground">
                Preview: {exam.title} {includeAnswers && <span className="text-emerald-600 font-normal">(Answer Key)</span>}
              </h2>
              <button onClick={closePreview} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              {previewUrl && (
                <iframe src={previewUrl} className="w-full h-full border-0" title="Exam PDF Preview" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
