"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import { getToken, isAuthenticated, getLoginPath } from "@/lib/auth";
import {
  api,
  questionsApi,
  academicManagementApi,
  type Exam,
  type ExamQuestionPayload,
  type Question,
  type ClassItem,
  type Subject,
  type Book,
  type Chapter,
  type Topic,
} from "@/lib/api";
import { ArrowLeft, Search, Check, Loader2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";

const questionTypes = [
  { value: "mcq", label: "MCQ" },
  { value: "short_answer", label: "Short Answer" },
  { value: "very_short_answer", label: "Very Short Answer" },
  { value: "fill_blank", label: "Fill in the Blank" },
  { value: "true_false", label: "True/False" },
  { value: "matching", label: "Matching" },
  { value: "descriptive", label: "Descriptive" },
  { value: "creative", label: "Creative Question" },
  { value: "problem_solving", label: "Problem Solving" },
];

const difficulties = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

const selectClass = "w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed";

export default function ExamQuestionBankPage() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const examId = Number(params.id);
  const portalBase = pathname.startsWith("/teacher") ? "/teacher" : "/admin";

  const [exam, setExam] = useState<Exam | null>(null);

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  const [filterClass, setFilterClass] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterBook, setFilterBook] = useState("");
  const [filterChapter, setFilterChapter] = useState("");
  const [filterTopic, setFilterTopic] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [search, setSearch] = useState("");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedQuestions, setSelectedQuestions] = useState<Map<number, Question>>(new Map());
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { router.push(getLoginPath(pathname)); return; }
    const token = getToken();
    if (!token || !examId) return;

    (async () => {
      try {
        const [exams, classesData, subjectsData] = await Promise.all([
          api.getExams(token),
          academicManagementApi.getClasses(token),
          academicManagementApi.getSubjects(token),
        ]);
        setExam(exams.find((e) => e.id === examId) ?? null);
        setClasses(classesData);
        setSubjects(subjectsData);
      } catch {
        toast.error("Failed to load filters");
      }
    })();
  }, [examId, router, pathname]);

  useEffect(() => {
    const token = getToken();
    if (!token || !filterSubject) { setBooks([]); setFilterBook(""); return; }
    academicManagementApi
      .getBooks(token, Number(filterSubject), filterClass ? Number(filterClass) : undefined)
      .then(setBooks)
      .catch(() => toast.error("Failed to load books"));
  }, [filterSubject, filterClass]);

  useEffect(() => {
    const token = getToken();
    if (!token || !filterBook) { setChapters([]); setFilterChapter(""); return; }
    academicManagementApi
      .getChapters(token, Number(filterBook))
      .then(setChapters)
      .catch(() => toast.error("Failed to load chapters"));
  }, [filterBook]);

  useEffect(() => {
    const token = getToken();
    if (!token || !filterChapter) { setTopics([]); setFilterTopic(""); return; }
    academicManagementApi
      .getTopics(token, Number(filterChapter))
      .then(setTopics)
      .catch(() => toast.error("Failed to load topics"));
  }, [filterChapter]);

  const fetchQuestions = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await questionsApi.getQuestions(token, {
        page,
        per_page: 20,
        status: "published",
        class_id: filterClass ? Number(filterClass) : undefined,
        subject_id: filterSubject ? Number(filterSubject) : undefined,
        book_id: filterBook ? Number(filterBook) : undefined,
        chapter_id: filterChapter ? Number(filterChapter) : undefined,
        topic_id: filterTopic ? Number(filterTopic) : undefined,
        question_type: filterType || undefined,
        difficulty: filterDifficulty || undefined,
        search: search || undefined,
      });
      setQuestions(res.questions);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch {
      toast.error("Failed to load question bank");
    } finally {
      setLoading(false);
    }
  }, [page, filterClass, filterSubject, filterBook, filterChapter, filterTopic, filterType, filterDifficulty, search]);

  useEffect(() => {
    void fetchQuestions();
  }, [fetchQuestions]);

  const clearFilters = () => {
    setFilterClass("");
    setFilterSubject("");
    setFilterBook("");
    setFilterChapter("");
    setFilterTopic("");
    setFilterType("");
    setFilterDifficulty("");
    setSearch("");
    setPage(1);
  };

  const toggleSelect = (q: Question) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(q.id)) next.delete(q.id);
      else next.add(q.id);
      return next;
    });
    setSelectedQuestions((prev) => {
      const next = new Map(prev);
      if (next.has(q.id)) next.delete(q.id);
      else next.set(q.id, q);
      return next;
    });
  };

  const addSelected = async () => {
    const token = getToken();
    if (!token || selectedIds.size === 0) return;
    setImporting(true);
    try {
      let added = 0;
      for (const q of selectedQuestions.values()) {
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

        const payload: ExamQuestionPayload = {
          question_text: q.question_text,
          option_a: optionA,
          option_b: optionB,
          option_c: optionC,
          option_d: optionD,
          correct_option: correctOption,
        };
        await api.addExamQuestion(token, examId, payload);
        added++;
      }
      toast.success(`Added ${added} question${added === 1 ? "" : "s"} to the exam`);
      router.push(`${portalBase}/exams/${examId}?tab=questions`);
    } catch {
      toast.error("Failed to import some questions");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`${portalBase}/exams/${examId}?tab=questions`)}
          className="p-2 rounded-xl hover:bg-secondary text-muted-foreground shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">Select from Question Bank</h1>
          {exam && <p className="text-sm text-muted-foreground mt-1 truncate">For: {exam.title}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: questions list */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search questions..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {selectedIds.size} selected · {total} question{total === 1 ? "" : "s"} found
            </p>
          </div>

          <div className="max-h-[600px] overflow-y-auto divide-y divide-border">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : questions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No questions found</p>
            ) : (
              questions.map((q) => (
                <div
                  key={q.id}
                  onClick={() => toggleSelect(q)}
                  className={`p-4 cursor-pointer transition-all ${
                    selectedIds.has(q.id) ? "bg-primary/5" : "hover:bg-secondary/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                      selectedIds.has(q.id) ? "border-primary bg-primary" : "border-border"
                    }`}>
                      {selectedIds.has(q.id) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground line-clamp-2">{q.question_text}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {q.class_name && <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">{q.class_name}</span>}
                        {q.subject_name && <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">{q.subject_name}</span>}
                        {q.chapter_name && <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">{q.chapter_name}</span>}
                        <span className="text-xs text-muted-foreground">{q.difficulty}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border">
              <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: filters */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-4 h-fit">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Filters</h2>
            <button onClick={clearFilters} className="text-xs font-medium text-primary hover:underline">
              Clear all
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Class</label>
            <select
              value={filterClass}
              onChange={(e) => { setFilterClass(e.target.value); setPage(1); }}
              className={selectClass}
            >
              <option value="">All Classes</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Subject</label>
            <select
              value={filterSubject}
              onChange={(e) => { setFilterSubject(e.target.value); setPage(1); }}
              className={selectClass}
            >
              <option value="">All Subjects</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Book</label>
            <select
              value={filterBook}
              onChange={(e) => { setFilterBook(e.target.value); setPage(1); }}
              disabled={!filterSubject}
              className={selectClass}
            >
              <option value="">All Books</option>
              {books.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Chapter</label>
            <select
              value={filterChapter}
              onChange={(e) => { setFilterChapter(e.target.value); setPage(1); }}
              disabled={!filterBook}
              className={selectClass}
            >
              <option value="">All Chapters</option>
              {chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Topic</label>
            <select
              value={filterTopic}
              onChange={(e) => { setFilterTopic(e.target.value); setPage(1); }}
              disabled={!filterChapter}
              className={selectClass}
            >
              <option value="">All Topics</option>
              {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Question Type</label>
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              className={selectClass}
            >
              <option value="">All Types</option>
              {questionTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Difficulty</label>
            <select
              value={filterDifficulty}
              onChange={(e) => { setFilterDifficulty(e.target.value); setPage(1); }}
              className={selectClass}
            >
              <option value="">All Difficulties</option>
              {difficulties.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-card border-t border-border p-4 flex items-center justify-end gap-3 z-40">
        <button
          onClick={() => router.push(`${portalBase}/exams/${examId}?tab=questions`)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
        >
          <X className="w-4 h-4" /> Cancel
        </button>
        <button
          onClick={addSelected}
          disabled={selectedIds.size === 0 || importing}
          className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          {importing && <Loader2 className="w-4 h-4 animate-spin" />}
          Add {selectedIds.size} Question{selectedIds.size === 1 ? "" : "s"}
        </button>
      </div>
    </div>
  );
}
