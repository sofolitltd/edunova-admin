"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getToken, isAuthenticated, getLoginPath } from "@/lib/auth";
import { api, batchApi, lessonApi, academicManagementApi, type Lesson, type LessonKind, type Course, type Book, type Chapter, type Topic } from "@/lib/api";
import { useBatchFilter } from "@/hooks/useBatchFilter";
import { BatchFilterSelect } from "@/components/BatchFilterSelect";
import { BookOpen, Plus, Edit, Trash2, X, Save, Calendar, Loader2, GraduationCap, FileText } from "lucide-react";
import { toast } from "sonner";

export default function LessonsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { isTeacherPortal, batches, selectedBatchId, setSelectedBatchId, batchIdNum } = useBatchFilter();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [todayLessons, setTodayLessons] = useState<Lesson[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCourse, setFilterCourse] = useState<number | "">("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    course_id: 0,
    batch_id: 0,
    title: "",
    description: "",
    subject: "",
    chapter: "",
    chapter_id: 0,
    topic: "",
    topic_id: 0,
    lesson_date: new Date().toISOString().split("T")[0],
    teacher_notes: "",
    kind: "lesson" as LessonKind,
    link_url: "",
  });
  const [batchSubjects, setBatchSubjects] = useState<{ name: string; subjectId: number }[]>([]);
  const batchSubjectNames = batchSubjects.map((s) => s.name);
  // Curriculum picker: book (edition) -> chapter -> topic. "Other" keeps free text.
  const [books, setBooks] = useState<Book[]>([]);
  const [bookId, setBookId] = useState(0);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [customChapter, setCustomChapter] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showDelete, setShowDelete] = useState<Lesson | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.push(getLoginPath(pathname)); return; }
  }, [router, pathname]);

  const loadCourses = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await api.getCourses(token);
      setCourses(data);
    } catch {
      toast.error("Failed to load courses");
    }
  }, []);

  const loadLessons = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const [all, today] = await Promise.all([
        lessonApi.getLessons(token, batchIdNum),
        lessonApi.getTodayLessons(token, batchIdNum),
      ]);
      setLessons(all);
      setTodayLessons(today);
    } catch {
      toast.error("Failed to load lessons");
    } finally {
      setLoading(false);
    }
  }, [batchIdNum]);

  useEffect(() => {
    loadCourses();
    loadLessons();
  }, [loadCourses, loadLessons]);

  useEffect(() => {
    const token = getToken();
    if (!showForm || !form.batch_id || !token) return;
    let cancelled = false;
    batchApi
      .getBatchSubjects(token, form.batch_id)
      .then((subjects) => {
        if (!cancelled) {
          const seen = new Map(subjects.map((s) => [s.subject_name, s.subject_id]));
          setBatchSubjects([...seen].map(([name, subjectId]) => ({ name, subjectId })));
        }
      })
      .catch(() => {
        if (!cancelled) setBatchSubjects([]);
      });
    return () => {
      cancelled = true;
    };
  }, [showForm, form.batch_id]);

  const subjectId = batchSubjects.find((s) => s.name === form.subject)?.subjectId ?? 0;

  useEffect(() => {
    const token = getToken();
    if (!showForm || !subjectId || !token) { setBooks([]); return; }
    let cancelled = false;
    academicManagementApi
      .getBooks(token, subjectId, undefined, true)
      .then((list) => {
        if (cancelled) return;
        setBooks(list);
        setBookId((cur) => (list.some((b) => b.id === cur) ? cur : list.length === 1 ? list[0].id : 0));
      })
      .catch(() => { if (!cancelled) setBooks([]); });
    return () => { cancelled = true; };
  }, [showForm, subjectId]);

  useEffect(() => {
    const token = getToken();
    if (!bookId || !token) { setChapters([]); return; }
    let cancelled = false;
    academicManagementApi.getChapters(token, bookId)
      .then((list) => { if (!cancelled) setChapters(list); })
      .catch(() => { if (!cancelled) setChapters([]); });
    return () => { cancelled = true; };
  }, [bookId]);

  useEffect(() => {
    const token = getToken();
    if (!form.chapter_id || !token) { setTopics([]); return; }
    let cancelled = false;
    academicManagementApi.getTopics(token, form.chapter_id)
      .then((list) => { if (!cancelled) setTopics(list); })
      .catch(() => { if (!cancelled) setTopics([]); });
    return () => { cancelled = true; };
  }, [form.chapter_id]);

  const filteredLessons = filterCourse
    ? lessons.filter((l) => l.course_id === filterCourse)
    : lessons;

  const resetForm = () => {
    setForm({
      course_id: 0,
      batch_id: isTeacherPortal && batches.length === 1 ? batches[0].id : 0,
      title: "",
      description: "",
      subject: "",
      chapter: "",
      chapter_id: 0,
      topic: "",
      topic_id: 0,
      lesson_date: new Date().toISOString().split("T")[0],
      teacher_notes: "",
      kind: "lesson",
      link_url: "",
    });
    setBookId(0);
    setCustomChapter(false);
    setEditingId(null);
    setShowForm(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (lesson: Lesson) => {
    setEditingId(lesson.id);
    setForm({
      course_id: lesson.course_id,
      batch_id: lesson.batch_id || 0,
      title: lesson.title,
      description: lesson.description || "",
      subject: lesson.subject || "",
      chapter: lesson.chapter || "",
      chapter_id: lesson.chapter_id || 0,
      topic: lesson.topic || "",
      topic_id: lesson.topic_id || 0,
      lesson_date: lesson.lesson_date?.split("T")[0] || new Date().toISOString().split("T")[0],
      teacher_notes: lesson.teacher_notes || "",
      kind: lesson.kind || "lesson",
      link_url: lesson.link_url || "",
    });
    setBookId(0);
    setCustomChapter(!lesson.chapter_id && !!lesson.chapter);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.course_id) { toast.error("Please select a course"); return; }
    if (isTeacherPortal && !form.batch_id) { toast.error("Please select a batch"); return; }
    if (!form.lesson_date) { toast.error("Lesson date is required"); return; }
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      if (editingId) {
        await lessonApi.updateLesson(token, editingId, form);
        toast.success("Lesson updated");
      } else {
        await lessonApi.createLesson(token, form);
        toast.success("Lesson created");
      }
      resetForm();
      loadLessons();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      await lessonApi.deleteLesson(token, showDelete.id);
      toast.success("Lesson deleted");
      setShowDelete(null);
      loadLessons();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getCourseName = (id: number) => courses.find((c) => c.id === id)?.title || `Course #${id}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lessons</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage daily lessons and teaching transparency</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark transition-all"
        >
          <Plus className="w-4 h-4" />
          New Lesson
        </button>
      </div>

      {/* Today's Lessons */}
      {todayLessons.length > 0 && (
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Today&apos;s Lessons</h2>
              <p className="text-xs text-muted-foreground">
                {todayLessons.length} lesson{todayLessons.length !== 1 ? "s" : ""} scheduled for today
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="bg-card border border-border rounded-xl p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-foreground line-clamp-1">{lesson.title}</h3>
                  <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    Today
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{getCourseName(lesson.course_id)}</p>
                {(lesson.subject || lesson.chapter) && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {lesson.subject && <span>{lesson.subject}</span>}
                    {lesson.subject && lesson.chapter && <span>·</span>}
                    {lesson.chapter && <span>{lesson.chapter}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={filterCourse}
          onChange={(e) => setFilterCourse(e.target.value ? Number(e.target.value) : "")}
          className="px-3 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">All Courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        <BatchFilterSelect batches={batches} value={selectedBatchId} onChange={setSelectedBatchId} isTeacherPortal={isTeacherPortal} />
        <span className="text-sm text-muted-foreground">
          {filteredLessons.length} lesson{filteredLessons.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Lessons Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-muted-foreground">Loading...</div>
        ) : filteredLessons.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No lessons found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {filterCourse ? "Try a different course filter" : "Create your first lesson to get started"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Course</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Subject</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Chapter</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Title</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground hidden lg:table-cell">Description</th>
                  <th className="text-right px-6 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLessons.map((lesson) => {
                  const isToday = lesson.lesson_date === new Date().toISOString().split("T")[0];
                  return (
                    <tr key={lesson.id} className={`hover:bg-secondary/30 transition-colors ${isToday ? "bg-primary/5" : ""}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isToday && (
                            <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                          )}
                          <span className="text-sm text-foreground">{formatDate(lesson.lesson_date)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
                          <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
                          {getCourseName(lesson.course_id)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">{lesson.subject || "—"}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{lesson.chapter || "—"}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-foreground">{lesson.title}</div>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <p className="text-xs text-muted-foreground line-clamp-2 max-w-xs">{lesson.description || "—"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(lesson)}
                            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowDelete(lesson)}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={resetForm}>
          <div
            className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card rounded-t-2xl z-10">
              <h3 className="font-semibold text-foreground">
                {editingId ? "Edit Lesson" : "New Lesson"}
              </h3>
              <button onClick={resetForm} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Course *</label>
                <select
                  value={form.course_id || ""}
                  onChange={(e) => setForm({ ...form, course_id: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Select a course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Batch{isTeacherPortal ? " *" : ""}
                </label>
                <select
                  value={form.batch_id || ""}
                  onChange={(e) => setForm({ ...form, batch_id: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">{isTeacherPortal ? "Select a batch" : "No specific batch"}</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>{b.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Type</label>
                <select
                  value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value as LessonKind })}
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="lesson">Class note (what was taught)</option>
                  <option value="video">Video</option>
                  <option value="homework">Homework</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Introduction to Algebra"
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of the lesson..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Link (video, Drive, PDF…)</label>
                <input
                  type="url"
                  value={form.link_url}
                  onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                  placeholder="https://"
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Subject</label>
                  {form.batch_id && batchSubjectNames.length > 0 ? (
                    <select
                      value={form.subject}
                      onChange={(e) => {
                        setForm({ ...form, subject: e.target.value, chapter: "", chapter_id: 0, topic: "", topic_id: 0 });
                        setBookId(0);
                        setCustomChapter(false);
                      }}
                      className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">Select a subject</option>
                      {form.subject && !batchSubjectNames.includes(form.subject) && (
                        <option value={form.subject}>{form.subject}</option>
                      )}
                      {batchSubjectNames.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder="e.g. Mathematics"
                      className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Chapter</label>
                  {books.length > 0 && !customChapter ? (
                    <div className="space-y-2">
                      {books.length > 1 && (
                        <select value={bookId} onChange={(e) => setBookId(Number(e.target.value))} className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                          <option value={0}>Select a book</option>
                          {books.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}{b.class_name ? ` · ${b.class_name}` : ""}{b.academic_year ? ` (${b.academic_year})` : ""}
                            </option>
                          ))}
                        </select>
                      )}
                      <select
                        value={form.chapter_id}
                        onChange={(e) => {
                          if (e.target.value === "other") { setCustomChapter(true); setForm({ ...form, chapter_id: 0, topic: "", topic_id: 0 }); return; }
                          const ch = chapters.find((c) => c.id === Number(e.target.value));
                          setForm({ ...form, chapter_id: ch?.id ?? 0, chapter: ch ? ch.name_bn || ch.name : "", topic: "", topic_id: 0 });
                        }}
                        className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value={0}>Select a chapter</option>
                        {form.chapter_id > 0 && !chapters.some((c) => c.id === form.chapter_id) && (
                          <option value={form.chapter_id}>{form.chapter}</option>
                        )}
                        {chapters.map((c) => (
                          <option key={c.id} value={c.id}>{c.name_bn || c.name}</option>
                        ))}
                        <option value="other">Other (type manually)</option>
                      </select>
                      {form.chapter_id > 0 && topics.length > 0 && (
                        <select
                          value={form.topic_id}
                          onChange={(e) => {
                            const t = topics.find((x) => x.id === Number(e.target.value));
                            setForm({ ...form, topic_id: t?.id ?? 0, topic: t ? t.name_bn || t.name : "" });
                          }}
                          className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                          <option value={0}>Topic (optional)</option>
                          {topics.map((t) => (
                            <option key={t.id} value={t.id}>{t.name_bn || t.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={form.chapter}
                        onChange={(e) => setForm({ ...form, chapter: e.target.value, chapter_id: 0, topic_id: 0 })}
                        placeholder="e.g. Chapter 3"
                        className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      {books.length > 0 && (
                        <button type="button" onClick={() => setCustomChapter(false)} className="text-xs text-primary font-medium hover:underline">
                          Pick from curriculum
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Lesson Date *</label>
                <input
                  type="date"
                  value={form.lesson_date}
                  onChange={(e) => setForm({ ...form, lesson_date: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Teacher Notes</label>
                <textarea
                  value={form.teacher_notes}
                  onChange={(e) => setForm({ ...form, teacher_notes: e.target.value })}
                  placeholder="Internal notes for the teacher (not visible to students)..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border sticky bottom-0 bg-card rounded-b-2xl">
              <button
                onClick={resetForm}
                className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim() || !form.course_id || !form.lesson_date || (isTeacherPortal && !form.batch_id)}
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
          <div
            className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Delete Lesson</h3>
              <button onClick={() => setShowDelete(null)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted-foreground">
                Delete <strong className="text-foreground">{showDelete.title}</strong>
                {showDelete.lesson_date ? ` on ${formatDate(showDelete.lesson_date)}` : ""}?
              </p>
              <p className="text-xs text-muted-foreground mt-2">This action cannot be undone.</p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button
                onClick={() => setShowDelete(null)}
                className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
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
