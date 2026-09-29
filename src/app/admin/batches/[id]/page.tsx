"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getToken, isAuthenticated } from "@/lib/auth";
import {
  batchApi,
  api,
  attendanceApi,
  notificationApi,
  academicManagementApi,
  type Batch,
  type Course,
  type Exam,
  type CreateExamPayload,
  type BatchFinanceStats,
  type AttendanceRecord,
  type AttendanceReport,
  type BatchMonthlyAttendance,
  type BatchTeacher,
  type Teacher,
  type BatchSubject,
  type Subject,
} from "@/lib/api";
import {
  ArrowLeft,
  Users,
  UserPlus,
  Search,
  BookOpen,
  GraduationCap,
  Bell,
  User,
  Trophy,
  Clock,
  Trash2,
  Loader2,
  DollarSign,
  TrendingUp,
  Wallet,
  CheckCircle,
  Save,
  Calendar,
  CalendarRange,
  RotateCcw,
  X,
  Send,
  AlertCircle,
  Plus,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";

type BatchStudent = { id: number; full_name: string; mobile: string; student_id: string; user_id: number | null; amount: number; enrolled_by: string; created_at: string };
type Tab = "about" | "students" | "schedule" | "exam" | "notice" | "teacher" | "leaderboard" | "earnings" | "attendance";

const SCHEDULE_DAYS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
const ROUTINE_DAYS = SCHEDULE_DAYS.filter((d) => d !== "Fri");

// Renders a stored 24h "HH:MM" as "hh:mmAM/PM" (e.g. "19:00" -> "07:00PM").
function formatTime12h(t: string): string {
  const [hStr, mStr] = t.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!t || Number.isNaN(h) || Number.isNaN(m)) return t;
  const suffix = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${String(displayHour).padStart(2, "0")}:${String(m).padStart(2, "0")}${suffix}`;
}

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "students", label: "Students", icon: <Users className="w-3.5 h-3.5" /> },
  { key: "about", label: "About", icon: <BookOpen className="w-3.5 h-3.5" /> },
  { key: "schedule", label: "Schedule", icon: <Clock className="w-3.5 h-3.5" /> },
  { key: "earnings", label: "Earnings", icon: <DollarSign className="w-3.5 h-3.5" /> },
  { key: "attendance", label: "Attendance", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  { key: "exam", label: "Exam", icon: <GraduationCap className="w-3.5 h-3.5" /> },
  { key: "notice", label: "Notice", icon: <Bell className="w-3.5 h-3.5" /> },
  { key: "teacher", label: "Teacher", icon: <User className="w-3.5 h-3.5" /> },
  { key: "leaderboard", label: "Leaderboard", icon: <Trophy className="w-3.5 h-3.5" /> },
];

export default function BatchDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const batchCode = String(params.id);

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const t = searchParams.get("tab");
    return TABS.some((x) => x.key === t) ? (t as Tab) : "students";
  });

  const handleTabChange = (key: Tab) => {
    setActiveTab(key);
    router.replace(`/admin/batches/${batchCode}?tab=${key}`, { scroll: false });
  };

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && TABS.some((x) => x.key === t) && t !== activeTab) {
      setActiveTab(t as Tab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const [loading, setLoading] = useState(true);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const defaultExamForm = { title: "", date: "", time: "", duration: "", total_marks: 0 };
  const [showExamModal, setShowExamModal] = useState(false);
  const [examForm, setExamForm] = useState(defaultExamForm);
  const [savingExam, setSavingExam] = useState(false);

  const [students, setStudents] = useState<BatchStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<BatchStudent | null>(null);

  const [financeStats, setFinanceStats] = useState<BatchFinanceStats | null>(null);
  const [financeLoading, setFinanceLoading] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [attDate, setAttDate] = useState(today);
  const [attReport, setAttReport] = useState<AttendanceReport | null>(null);
  const [attMarks, setAttMarks] = useState<Record<number, { status: string; notes: string }>>({});
  const [attLoading, setAttLoading] = useState(false);
  const [attSaving, setAttSaving] = useState(false);
  const [attView, setAttView] = useState<"daily" | "monthly">("daily");

  const thisMonth = today.slice(0, 7);
  const [attMonth, setAttMonth] = useState(thisMonth);
  const [monthlyAttendance, setMonthlyAttendance] = useState<BatchMonthlyAttendance | null>(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  const [batchTeachers, setBatchTeachers] = useState<BatchTeacher[]>([]);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [batchTeachersLoaded, setBatchTeachersLoaded] = useState(false);
  const [batchTeachersLoading, setBatchTeachersLoading] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [assigningTeacher, setAssigningTeacher] = useState(false);
  const [unassigningTeacherId, setUnassigningTeacherId] = useState<number | null>(null);

  const [batchSubjects, setBatchSubjects] = useState<BatchSubject[]>([]);
  const [classSubjects, setClassSubjects] = useState<Subject[]>([]);
  const [batchSubjectsLoaded, setBatchSubjectsLoaded] = useState(false);
  const [batchSubjectsLoading, setBatchSubjectsLoading] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedSubjectTeacherId, setSelectedSubjectTeacherId] = useState("");
  const [assignedTeachers, setAssignedTeachers] = useState<BatchTeacher[]>([]);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [subjectDays, setSubjectDays] = useState<string[]>([]);
  const [subjectStartTime, setSubjectStartTime] = useState("");
  const [subjectEndTime, setSubjectEndTime] = useState("");
  const [assigningSubject, setAssigningSubject] = useState(false);
  const [unassigningEntryId, setUnassigningEntryId] = useState<number | null>(null);

  type BatchNotice = { id: number; title: string; body: string; sent_at: string };
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeBody, setNoticeBody] = useState("");
  const [noticeSending, setNoticeSending] = useState(false);
  const [noticeResult, setNoticeResult] = useState<{ success: boolean; message: string } | null>(null);
  const [notices, setNotices] = useState<BatchNotice[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(false);
  const [noticesLoaded, setNoticesLoaded] = useState(false);
  const [deletingNoticeId, setDeletingNoticeId] = useState<number | null>(null);

  const loadStudents = useCallback(async (b: Batch) => {
    const token = getToken();
    if (!token) return;
    setStudentsLoading(true);
    try {
      const data = await batchApi.getBatchStudents(token, b.id);
      setStudents(data);
    } catch {
      toast.error("Failed to load students");
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  const loadFinance = useCallback(async () => {
    const token = getToken();
    if (!token || !batch) return;
    setFinanceLoading(true);
    try {
      const data = await batchApi.getBatchFinance(token, batch.id);
      setFinanceStats(data);
    } catch {
      toast.error("Failed to load earnings");
    } finally {
      setFinanceLoading(false);
    }
  }, [batch]);

  const loadAttendance = useCallback(async () => {
    const token = getToken();
    if (!token || !batch) return;
    setAttLoading(true);
    try {
      const [attData, reportData] = await Promise.all([
        attendanceApi.getAttendance(token, attDate, String(batch.id)),
        attendanceApi.getReport(token, attDate, String(batch.id)),
      ]);
      setAttReport(reportData);
      const existingMarks: Record<number, { status: string; notes: string }> = {};
      (attData as AttendanceRecord[]).forEach((a) => {
        existingMarks[a.student_id] = { status: a.status, notes: a.notes };
      });
      setAttMarks(existingMarks);
    } catch {
      toast.error("Failed to load attendance");
    } finally {
      setAttLoading(false);
    }
  }, [batch, attDate]);

  const loadMonthlyAttendance = useCallback(async () => {
    const token = getToken();
    if (!token || !batch) return;
    setMonthlyLoading(true);
    try {
      const data = await batchApi.getBatchMonthlyAttendance(token, batch.id, attMonth);
      setMonthlyAttendance(data);
    } catch {
      toast.error("Failed to load monthly report");
    } finally {
      setMonthlyLoading(false);
    }
  }, [batch, attMonth]);

  const loadBatchTeachers = useCallback(async () => {
    const token = getToken();
    if (!token || !batch) return;
    setBatchTeachersLoading(true);
    try {
      const [assigned, all] = await Promise.all([
        batchApi.getBatchTeachers(token, batch.id),
        api.listTeachers(token),
      ]);
      setBatchTeachers(assigned);
      setAllTeachers(all);
      setBatchTeachersLoaded(true);
    } catch {
      toast.error("Failed to load teachers");
    } finally {
      setBatchTeachersLoading(false);
    }
  }, [batch]);

  const handleAssignTeacher = async () => {
    if (!selectedTeacherId || !batch) return;
    const token = getToken();
    if (!token) return;
    setAssigningTeacher(true);
    try {
      await batchApi.assignTeacher(token, batch.id, Number(selectedTeacherId));
      toast.success("Teacher assigned");
      setSelectedTeacherId("");
      const assigned = await batchApi.getBatchTeachers(token, batch.id);
      setBatchTeachers(assigned);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign teacher");
    } finally {
      setAssigningTeacher(false);
    }
  };

  const handleUnassignTeacher = async (teacherId: number) => {
    const token = getToken();
    if (!token || !batch) return;
    setUnassigningTeacherId(teacherId);
    try {
      await batchApi.unassignTeacher(token, batch.id, teacherId);
      setBatchTeachers((prev) => prev.filter((t) => t.id !== teacherId));
      toast.success("Teacher unassigned");
    } catch {
      toast.error("Failed to unassign teacher");
    } finally {
      setUnassigningTeacherId(null);
    }
  };

  const loadBatchSubjects = useCallback(async () => {
    const token = getToken();
    if (!token || !batch) return;
    setBatchSubjectsLoading(true);
    try {
      // Subjects aren't reliably linked to a class in Academic Management
      // (that link only exists via a Book row, which admins usually skip
      // when just adding a subject), so scoping this list by class would
      // silently hide subjects that were added but never got a book.
      // Show every subject instead.
      const [assigned, allSubjects, teachers] = await Promise.all([
        batchApi.getBatchSubjects(token, batch.id),
        academicManagementApi.getSubjects(token),
        batchApi.getBatchTeachers(token, batch.id),
      ]);
      setBatchSubjects(assigned);
      setClassSubjects(allSubjects);
      setAssignedTeachers(teachers);
      setBatchSubjectsLoaded(true);
    } catch {
      toast.error("Failed to load subjects");
    } finally {
      setBatchSubjectsLoading(false);
    }
  }, [batch]);

  const toggleSubjectDay = (day: string) => {
    setSubjectDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const handleAssignSubject = async () => {
    if (!selectedSubjectId || !batch) return;
    const token = getToken();
    if (!token) return;
    setAssigningSubject(true);
    try {
      const payload = {
        subject_id: Number(selectedSubjectId),
        teacher_id: selectedSubjectTeacherId ? Number(selectedSubjectTeacherId) : null,
        days: subjectDays,
        start_time: subjectStartTime,
        end_time: subjectEndTime,
      };
      if (editingEntryId) {
        await batchApi.updateSubjectEntry(token, batch.id, editingEntryId, payload);
        toast.success("Schedule updated");
      } else {
        await batchApi.assignSubject(token, batch.id, payload);
        toast.success("Subject assigned");
      }
      setSelectedSubjectId("");
      setSelectedSubjectTeacherId("");
      setSubjectDays([]);
      setSubjectStartTime("");
      setSubjectEndTime("");
      setEditingEntryId(null);
      const assigned = await batchApi.getBatchSubjects(token, batch.id);
      setBatchSubjects(assigned);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign subject");
    } finally {
      setAssigningSubject(false);
    }
  };

  const handleEditSubject = (s: BatchSubject) => {
    setEditingEntryId(s.id);
    setSelectedSubjectId(String(s.subject_id));
    setSelectedSubjectTeacherId(s.teacher_id ? String(s.teacher_id) : "");
    setSubjectDays(s.days);
    setSubjectStartTime(s.start_time);
    setSubjectEndTime(s.end_time);
  };

  const cancelEditSubject = () => {
    setEditingEntryId(null);
    setSelectedSubjectId("");
    setSelectedSubjectTeacherId("");
    setSubjectDays([]);
    setSubjectStartTime("");
    setSubjectEndTime("");
  };

  const handleUnassignSubject = async (entryId: number) => {
    const token = getToken();
    if (!token || !batch) return;
    setUnassigningEntryId(entryId);
    try {
      await batchApi.unassignSubject(token, batch.id, entryId);
      setBatchSubjects((prev) => prev.filter((s) => s.id !== entryId));
      toast.success("Subject unassigned");
      if (editingEntryId === entryId) cancelEditSubject();
    } catch {
      toast.error("Failed to unassign subject");
    } finally {
      setUnassigningEntryId(null);
    }
  };

  const loadNotices = useCallback(async () => {
    const token = getToken();
    if (!token || !batch) return;
    setNoticesLoading(true);
    try {
      const data = await notificationApi.getHistory(token, 1, 50, { target: "batch", targetId: batch.id });
      setNotices(data.notifications);
      setNoticesLoaded(true);
    } catch {
      toast.error("Failed to load notices");
    } finally {
      setNoticesLoading(false);
    }
  }, [batch]);

  const handleSendNotice = async () => {
    if (!noticeTitle.trim() || !noticeBody.trim()) {
      toast.error("Title and message are required");
      return;
    }
    const token = getToken();
    if (!token || !batch) return;
    setNoticeSending(true);
    setNoticeResult(null);
    try {
      const res = await notificationApi.send(token, { title: noticeTitle, body: noticeBody, batch_id: batch.id });
      setNoticeResult({ success: true, message: res.message });
      toast.success("Notice sent to batch");
      setNoticeTitle("");
      setNoticeBody("");
      loadNotices();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send notice";
      setNoticeResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setNoticeSending(false);
    }
  };

  const handleDeleteNotice = async (id: number) => {
    const token = getToken();
    if (!token) return;
    setDeletingNoticeId(id);
    try {
      await notificationApi.deleteNotification(token, id);
      setNotices((prev) => prev.filter((n) => n.id !== id));
      toast.success("Notice deleted");
    } catch {
      toast.error("Failed to delete notice");
    } finally {
      setDeletingNoticeId(null);
    }
  };

  const openCreateExam = () => {
    setExamForm(defaultExamForm);
    setShowExamModal(true);
  };

  const handleCreateExam = async () => {
    if (!batch) return;
    if (!examForm.title || !examForm.date || !examForm.time || !examForm.duration) {
      toast.error("All exam fields are required");
      return;
    }
    const token = getToken();
    if (!token) return;
    setSavingExam(true);
    try {
      const payload: CreateExamPayload = {
        title: examForm.title,
        course_id: batch.course_id,
        batch_id: batch.id,
        date: examForm.date,
        time: examForm.time,
        duration: examForm.duration,
        total_marks: Number(examForm.total_marks) || 0,
      };
      const created = await api.createExam(token, payload);
      setExams((prev) => [created, ...prev]);
      toast.success("Exam created — now add questions");
      setShowExamModal(false);
      router.push(`/admin/exams/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create exam");
    } finally {
      setSavingExam(false);
    }
  };

  useEffect(() => {
    if (activeTab === "earnings" && !financeStats && !financeLoading) {
      loadFinance();
    }
    if (activeTab === "attendance" && attView === "daily") {
      loadAttendance();
    }
    if (activeTab === "attendance" && attView === "monthly") {
      loadMonthlyAttendance();
    }
    if (activeTab === "teacher" && !batchTeachersLoaded && !batchTeachersLoading) {
      loadBatchTeachers();
    }
    if (activeTab === "notice" && !noticesLoaded && !noticesLoading) {
      loadNotices();
    }
    if (activeTab === "schedule" && !batchSubjectsLoaded && !batchSubjectsLoading) {
      loadBatchSubjects();
    }
  }, [activeTab, attDate, attView, attMonth, financeStats, financeLoading, loadFinance, loadAttendance, loadMonthlyAttendance, batchTeachersLoaded, batchTeachersLoading, loadBatchTeachers, noticesLoaded, noticesLoading, loadNotices, batchSubjectsLoaded, batchSubjectsLoading, loadBatchSubjects]);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/admin/login"); return; }
    const token = getToken();
    if (!token || !batchCode) return;

    const load = async () => {
      setLoading(true);
      try {
        const batches = await batchApi.getBatches(token);
        const found = batches.find((b) => b.code && b.code === batchCode) ?? batches.find((b) => String(b.id) === batchCode) ?? null;
        setBatch(found);
        if (!found) {
          toast.error("Batch not found");
          return;
        }

        const [courses, allExams] = await Promise.all([
          api.getCourses(token).catch(() => []),
          api.getExams(token).catch(() => []),
        ]);
        setCourse(courses.find((c) => c.id === found.course_id) ?? null);
        setExams(allExams.filter((e) => e.course_id === found.course_id));
        await loadStudents(found);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [batchCode, router, loadStudents]);

  const handleRemoveStudent = async () => {
    if (!confirmRemove) return;
    const s = confirmRemove;
    const token = getToken();
    if (!token) return;
    setRemovingId(s.id);
    try {
      await api.deleteEnrollment(token, s.id);
      setStudents((prev) => prev.filter((x) => x.id !== s.id));
      toast.success("Removed from batch");
      setConfirmRemove(null);
    } catch {
      toast.error("Failed to remove student from batch");
    } finally {
      setRemovingId(null);
    }
  };

  const setAttMark = (studentId: number, status: string) => {
    setAttMarks((prev) => ({
      ...prev,
      [studentId]: { status, notes: prev[studentId]?.notes || "" },
    }));
  };

  const rosterStudentIds = () => students.filter((s) => s.user_id).map((s) => s.user_id as number);

  const handleMarkAll = (status: string) => {
    setAttMarks((prev) => {
      const next = { ...prev };
      rosterStudentIds().forEach((id) => {
        next[id] = { status, notes: prev[id]?.notes || "" };
      });
      return next;
    });
  };

  const handleUnmarkAll = () => {
    const rosterIds = new Set(rosterStudentIds());
    setAttMarks((prev) => {
      const next: typeof prev = {};
      Object.entries(prev).forEach(([id, m]) => {
        if (!rosterIds.has(Number(id))) next[Number(id)] = m;
      });
      return next;
    });
  };

  const handleSaveAttendance = async () => {
    const token = getToken();
    if (!token) return;
    setAttSaving(true);
    try {
      const rosterIds = new Set(students.filter((s) => s.user_id).map((s) => s.user_id as number));
      const entries = Object.entries(attMarks)
        .filter(([id]) => rosterIds.has(Number(id)))
        .map(([id, m]) => ({ student_id: Number(id), status: m.status, notes: m.notes }));
      const result = await attendanceApi.markAttendance(token, { date: attDate, entries });
      toast.success(result.message);
      loadAttendance();
    } catch {
      toast.error("Failed to save attendance");
    } finally {
      setAttSaving(false);
    }
  };

  const formatCurrency = (amount: number) => `৳${amount.toLocaleString()}`;

  const getMonthLabel = (m: string) => {
    try {
      return new Date(m + "-01").toLocaleDateString("en-US", { month: "short" });
    } catch { return m; }
  };

  const formatNoticeDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString("en-BD");
  };

  const inputClass = "w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  const filteredStudents = studentSearch.trim()
    ? students.filter((s) => {
        const q = studentSearch.trim().toLowerCase();
        return (s.full_name || "").toLowerCase().includes(q) || s.mobile.includes(q);
      })
    : students;

  // Build a day-by-time routine grid: rows are the 6 class days (Friday is
  // the weekend day, excluded), columns are every distinct start/end time
  // slot in use across the batch's subjects, sorted chronologically.
  const routineTimeSlots = Array.from(
    new Set(
      batchSubjects
        .filter((s) => s.start_time || s.end_time)
        .map((s) => `${s.start_time}|${s.end_time}`)
    )
  )
    .map((key) => {
      const [start_time, end_time] = key.split("|");
      return { key, start_time, end_time };
    })
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const routineCell = (day: string, slotKey: string) =>
    batchSubjects.filter((s) => s.days.includes(day) && `${s.start_time}|${s.end_time}` === slotKey);

  if (loading) {
    return <div className="py-24 text-center text-muted-foreground">Loading...</div>;
  }

  if (!batch) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground mb-3">Batch not found</p>
        <button onClick={() => router.push("/admin/batches")} className="text-sm text-primary font-medium hover:underline">Back to Batches</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/admin/batches")}
          className="p-2 rounded-xl hover:bg-secondary text-muted-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{batch.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">{batch.course_name || course?.title || "No course"} &middot; {batch.schedule || "No schedule"}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto sm:flex-wrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all shrink-0 whitespace-nowrap ${
              activeTab === t.key ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <div className="border-b border-border" />

      {/* About */}
      {activeTab === "about" && (
        <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Class</p>
              <p className="text-sm font-medium text-foreground">{batch.class_level || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Shift</p>
              <p className="text-sm font-medium text-foreground">{batch.shift || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Type</p>
              <p className="text-sm font-medium text-foreground">{batch.type || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Year</p>
              <p className="text-sm font-medium text-foreground">{batch.year || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="text-sm font-medium text-foreground capitalize">{batch.status}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Max Students</p>
              <p className="text-sm font-medium text-foreground">{batch.max_students > 0 ? batch.max_students : "Unlimited"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Enrolled</p>
              <p className="text-sm font-medium text-foreground">{students.length}</p>
            </div>
          </div>

          {(batch.admission_fee > 0 || batch.note_fee > 0 || batch.monthly_fee > 0) && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              {batch.admission_fee > 0 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">Admission: ৳{batch.admission_fee}</span>
              )}
              {batch.note_fee > 0 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">Note: ৳{batch.note_fee}</span>
              )}
              {batch.monthly_fee > 0 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">Monthly: ৳{batch.monthly_fee}</span>
              )}
            </div>
          )}

          {course && (
            <div className="pt-2 border-t border-border space-y-1.5">
              <p className="text-sm font-semibold text-foreground">{course.title}</p>
              {course.description && <p className="text-sm text-muted-foreground">{course.description}</p>}
            </div>
          )}
        </div>
      )}

      {/* Students */}
      {activeTab === "students" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search students by name or phone..."
                className={`${inputClass} pl-10`}
              />
            </div>
            <button
              onClick={() => router.push(`/admin/batches/${batch.code || batch.id}/add-student`)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark transition-all shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              Add Student
            </button>
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Students ({filteredStudents.length})</h3>
            </div>
            {studentsLoading ? (
              <div className="py-12 text-center text-muted-foreground">Loading...</div>
            ) : students.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-3">No students in this batch yet</p>
                <button onClick={() => router.push(`/admin/batches/${batch.code || batch.id}/add-student`)} className="text-sm text-primary font-medium hover:underline">Add first student</button>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-12 text-center">
                <Search className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No students match &quot;{studentSearch}&quot;</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border">
                      <th className="px-6 py-3 font-medium">No.</th>
                      <th className="px-3 py-3 font-medium">Name</th>
                      <th className="px-3 py-3 font-medium">Roll</th>
                      <th className="px-3 py-3 font-medium">Mobile</th>
                      <th className="px-3 py-3 font-medium">Join Date</th>
                      <th className="px-6 py-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredStudents.map((s, i) => (
                      <tr
                        key={s.id}
                        onClick={() => s.user_id && router.push(`/admin/users/${s.user_id}?batchId=${batch.id}`)}
                        className={`hover:bg-secondary/50 ${s.user_id ? "cursor-pointer" : ""}`}
                        title={s.user_id ? "View student details" : "No linked account"}
                      >
                        <td className="px-6 py-3 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-sm font-semibold text-primary">{s.full_name?.charAt(0) || "?"}</span>
                            </div>
                            <span className={`font-medium text-foreground whitespace-nowrap ${s.user_id ? "hover:text-primary transition-colors" : ""}`}>{s.full_name || "No name"}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {s.student_id && (
                            <span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-primary/10 text-primary whitespace-nowrap">{s.student_id}</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{s.mobile}</td>
                        <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{new Date(s.created_at).toLocaleDateString("en-BD")}</td>
                        <td className="px-6 py-3 text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmRemove(s); }}
                            disabled={removingId === s.id}
                            title="Remove from batch"
                            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 shrink-0"
                          >
                            {removingId === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Schedule */}
      {activeTab === "schedule" && (
        <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Routine Days</p>
            <div className="flex flex-wrap gap-2">
              {batch.days && batch.days.length > 0 ? (
                batch.days.map((d) => (
                  <span key={d} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary">{d}</span>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No days set</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground">Start Time</p>
              <p className="text-sm font-medium text-foreground">{batch.start_time ? formatTime12h(batch.start_time) : "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">End Time</p>
              <p className="text-sm font-medium text-foreground">{batch.end_time ? formatTime12h(batch.end_time) : "-"}</p>
            </div>
          </div>
          {batch.schedule && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">Summary</p>
              <p className="text-sm font-medium text-foreground">{batch.schedule}</p>
            </div>
          )}
        </div>
      )}

      {/* Subjects & per-subject class times */}
      {activeTab === "schedule" && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-semibold text-foreground">Subjects &amp; Class Times</h3>
              <p className="text-xs text-muted-foreground">Subjects taught in this batch, each with its own weekly day/time slot and teacher</p>
            </div>
            {editingEntryId && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-primary/10 text-primary">Editing schedule</span>
            )}
          </div>

          <div className="px-6 py-4 border-b border-border space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Subject</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full px-3 py-2 pr-8 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
                >
                  <option value="">Select a subject...</option>
                  {classSubjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Teacher</label>
                <select
                  value={selectedSubjectTeacherId}
                  onChange={(e) => setSelectedSubjectTeacherId(e.target.value)}
                  className="w-full px-3 py-2 pr-8 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none"
                >
                  <option value="">No teacher assigned</option>
                  {assignedTeachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[auto_auto_1fr] gap-3 items-end">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Start Time</label>
                <input
                  type="time"
                  value={subjectStartTime}
                  onChange={(e) => setSubjectStartTime(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">End Time</label>
                <input
                  type="time"
                  value={subjectEndTime}
                  onChange={(e) => setSubjectEndTime(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex justify-end gap-2">
                {editingEntryId && (
                  <button
                    onClick={cancelEditSubject}
                    className="px-3 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-all"
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={handleAssignSubject}
                  disabled={!selectedSubjectId || assigningSubject}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {assigningSubject ? <Loader2 className="w-4 h-4 animate-spin" /> : editingEntryId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editingEntryId ? "Update" : "Add"}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {SCHEDULE_DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleSubjectDay(day)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    subjectDays.includes(day)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary text-secondary-foreground border-transparent hover:bg-secondary/80"
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {batchSubjectsLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading...</div>
          ) : batchSubjects.length === 0 ? (
            <div className="py-12 text-center">
              <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No subjects assigned to this batch yet</p>
            </div>
          ) : routineTimeSlots.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Assigned subjects have no day/time set yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-secondary/50 text-left text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="px-6 py-3 font-medium whitespace-nowrap">Day</th>
                    {routineTimeSlots.map((slot) => (
                      <th key={slot.key} className="px-3 py-3 font-medium whitespace-nowrap border-l border-border">
                        {slot.start_time || slot.end_time ? `${formatTime12h(slot.start_time)} - ${formatTime12h(slot.end_time)}` : "No time set"}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ROUTINE_DAYS.map((day) => (
                    <tr key={day} className="hover:bg-secondary/20">
                      <td className="px-6 py-3 font-medium text-foreground whitespace-nowrap">{day}</td>
                      {routineTimeSlots.map((slot) => {
                        const cellSubjects = routineCell(day, slot.key);
                        return (
                          <td key={slot.key} className="px-3 py-2 border-l border-border align-top">
                            {cellSubjects.length === 0 ? (
                              <span className="text-muted-foreground">-</span>
                            ) : (
                              <div className="space-y-1.5">
                                {cellSubjects.map((s) => (
                                  <button
                                    key={s.id}
                                    onClick={() => handleEditSubject(s)}
                                    title="Click to edit this class"
                                    className="block w-full text-left px-2 py-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                                  >
                                    <p className="text-sm font-medium text-foreground whitespace-nowrap">{s.subject_name}</p>
                                    {s.teacher_name && (
                                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                                        ({s.teacher_name.trim().split(/\s+/).pop()})
                                      </p>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {editingEntryId && (
            <div className="px-6 py-3 border-t border-border flex items-center justify-between gap-3 bg-secondary/20">
              <p className="text-xs text-muted-foreground">Editing this subject&apos;s schedule — use the form above to update, or remove it entirely.</p>
              <button
                onClick={() => handleUnassignSubject(editingEntryId)}
                disabled={unassigningEntryId === editingEntryId}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-destructive hover:bg-destructive/10 text-xs font-medium transition-colors disabled:opacity-50 shrink-0"
              >
                {unassigningEntryId === editingEntryId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Remove subject
              </button>
            </div>
          )}
        </div>
      )}

      {/* Earnings */}
      {activeTab === "earnings" && (
        <div className="space-y-4">
          {financeLoading && !financeStats ? (
            <div className="py-12 text-center text-muted-foreground">Loading...</div>
          ) : !financeStats ? (
            <div className="py-12 text-center text-muted-foreground">Failed to load earnings</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-card rounded-2xl border border-border p-5">
                  <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center mb-3">
                    <TrendingUp className="w-5 h-5 text-success" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">{formatCurrency(financeStats.total_revenue)}</div>
                  <div className="text-sm text-muted-foreground">Total Revenue</div>
                </div>
                <div className="bg-card rounded-2xl border border-border p-5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <DollarSign className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">{financeStats.approved_count}</div>
                  <div className="text-sm text-muted-foreground">Approved Payments</div>
                </div>
                <div className="bg-card rounded-2xl border border-border p-5">
                  <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center mb-3">
                    <Wallet className="w-5 h-5 text-warning" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">{formatCurrency(financeStats.pending_payments)}</div>
                  <div className="text-sm text-muted-foreground">Pending ({financeStats.pending_count})</div>
                </div>
              </div>

              <div className="bg-card rounded-2xl border border-border p-6">
                <h2 className="font-semibold text-foreground mb-4">Revenue (Last 6 Months)</h2>
                {(() => {
                  const maxVal = Math.max(...financeStats.monthly_data.map((m) => m.revenue), 1);
                  return (
                    <div className="flex items-end gap-3 h-48">
                      {financeStats.monthly_data.map((m, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className="flex items-end w-full" style={{ height: "160px" }}>
                            <div
                              className="flex-1 bg-success rounded-t-lg transition-all"
                              style={{ height: `${(m.revenue / maxVal) * 100}%`, minHeight: m.revenue > 0 ? "4px" : "0" }}
                              title={`Revenue: ${formatCurrency(m.revenue)}`}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{getMonthLabel(m.month)}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <h2 className="font-semibold text-foreground">Recent Payments</h2>
                </div>
                <div className="divide-y divide-border">
                  {financeStats.recent_payments.length === 0 ? (
                    <div className="px-6 py-8 text-center text-muted-foreground text-sm">No payments yet</div>
                  ) : (
                    financeStats.recent_payments.map((e) => (
                      <div key={e.id} className="flex items-center justify-between px-6 py-3">
                        <div>
                          <div className="text-sm font-medium text-foreground">{e.full_name}</div>
                          <div className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString("en-BD")}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-foreground">{formatCurrency(e.amount)}</div>
                          <div className={`text-xs font-medium ${e.status === "approved" ? "text-success" : e.status === "rejected" ? "text-destructive" : "text-warning"}`}>
                            {e.status}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Attendance */}
      {activeTab === "attendance" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAttView("daily")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${attView === "daily" ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
            >
              Daily
            </button>
            <button
              onClick={() => setAttView("monthly")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${attView === "monthly" ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
            >
              Monthly Report
            </button>
          </div>

          {attView === "daily" && (
            <>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <input
                  type="date"
                  value={attDate}
                  onChange={(e) => setAttDate(e.target.value)}
                  className="px-3 py-2 border border-border rounded-xl bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {attDate === today && (
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-lg">Today</span>
                )}
              </div>

              {attReport && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-card border border-border rounded-xl p-4">
                    <p className="text-xs text-muted-foreground">Total in Batch</p>
                    <p className="text-2xl font-bold text-foreground">{attReport.total}</p>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4">
                    <p className="text-xs text-muted-foreground">Present</p>
                    <p className="text-2xl font-bold text-emerald-600">{attReport.present}</p>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4">
                    <p className="text-xs text-muted-foreground">Absent</p>
                    <p className="text-2xl font-bold text-red-600">{attReport.absent}</p>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-4">
                    <p className="text-xs text-muted-foreground">Rate</p>
                    <p className="text-2xl font-bold text-primary">{attReport.attendance_rate.toFixed(1)}%</p>
                  </div>
                </div>
              )}

              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
                  <h2 className="font-semibold text-foreground">Students ({students.filter((s) => s.user_id).length})</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleMarkAll("present")}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 transition-all"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Mark All Present
                    </button>
                    <button
                      onClick={handleUnmarkAll}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-secondary text-muted-foreground hover:text-foreground transition-all"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Unmark All
                    </button>
                    <button
                      onClick={handleSaveAttendance}
                      disabled={attSaving || Object.keys(attMarks).length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-all disabled:opacity-50"
                    >
                      {attSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Attendance
                    </button>
                  </div>
                </div>

                {attLoading ? (
                  <div className="p-8 text-center text-muted-foreground">Loading...</div>
                ) : students.filter((s) => s.user_id).length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">No students with linked accounts in this batch</div>
                ) : (
                  <div className="divide-y divide-border">
                    {students.filter((s) => s.user_id).map((s) => {
                      const studentId = s.user_id as number;
                      const mark = attMarks[studentId];
                      const status = mark?.status || "";
                      const checked = status === "present";
                      return (
                        <div key={s.id} className="px-6 py-3 flex items-center gap-4 hover:bg-secondary/50 transition-all">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => setAttMark(studentId, e.target.checked ? "present" : "absent")}
                            className="w-5 h-5 rounded border-border accent-primary cursor-pointer shrink-0"
                            title={checked ? "Present (uncheck to mark absent)" : "Absent (check to mark present)"}
                          />
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-sm font-bold text-white shrink-0">
                            {s.full_name?.charAt(0)?.toUpperCase() || "S"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{s.full_name}</p>
                            <p className="text-xs text-muted-foreground">{s.mobile}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setAttMark(studentId, "late")}
                              className={`p-2 rounded-xl transition-all ${status === "late" ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" : "text-muted-foreground hover:bg-secondary"}`}
                              title="Late"
                            >
                              <Clock className="w-5 h-5" />
                            </button>
                            {status && (
                              <span className={`text-xs font-medium px-2 py-1 rounded-lg w-16 text-center ${
                                status === "present" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : status === "absent" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              }`}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {attView === "monthly" && (
            <>
              <div className="flex items-center gap-3">
                <CalendarRange className="w-5 h-5 text-muted-foreground" />
                <input
                  type="month"
                  value={attMonth}
                  onChange={(e) => setAttMonth(e.target.value)}
                  className="px-3 py-2 border border-border rounded-xl bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {attMonth === thisMonth && (
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-lg">This Month</span>
                )}
              </div>

              {monthlyLoading ? (
                <div className="py-12 text-center text-muted-foreground">Loading...</div>
              ) : !monthlyAttendance ? (
                <div className="py-12 text-center text-muted-foreground">Failed to load monthly report</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-card border border-border rounded-xl p-4">
                      <p className="text-xs text-muted-foreground">Classes Held</p>
                      <p className="text-2xl font-bold text-foreground">{monthlyAttendance.total_classes}</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4">
                      <p className="text-xs text-muted-foreground">Students</p>
                      <p className="text-2xl font-bold text-foreground">{monthlyAttendance.students.length}</p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4">
                      <p className="text-xs text-muted-foreground">Avg. Attendance Rate</p>
                      <p className="text-2xl font-bold text-primary">{monthlyAttendance.overall_rate.toFixed(1)}%</p>
                    </div>
                  </div>

                  {monthlyAttendance.total_classes === 0 ? (
                    <div className="bg-card border border-border rounded-2xl py-12 text-center text-muted-foreground">
                      No attendance was marked for this batch in {monthlyAttendance.month}
                    </div>
                  ) : (
                    <>
                      <div className="bg-card rounded-2xl border border-border p-6">
                        <h2 className="font-semibold text-foreground mb-4">Daily Attendance</h2>
                        <div className="flex items-end gap-2 h-40 overflow-x-auto pb-1">
                          {monthlyAttendance.days.map((d) => {
                            const dayTotal = d.present + d.absent + d.late;
                            const rate = dayTotal > 0 ? (d.present / dayTotal) * 100 : 0;
                            return (
                              <div key={d.date} className="flex flex-col items-center gap-1 shrink-0" style={{ width: "28px" }}>
                                <div className="flex items-end w-full" style={{ height: "110px" }}>
                                  <div
                                    className="w-full bg-primary rounded-t-lg transition-all"
                                    style={{ height: `${Math.max(rate, 2)}%` }}
                                    title={`${d.date}: ${d.present} present, ${d.absent} absent, ${d.late} late`}
                                  />
                                </div>
                                <span className="text-[10px] text-muted-foreground">{new Date(d.date).getDate()}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="bg-card rounded-2xl border border-border overflow-hidden">
                        <div className="px-6 py-4 border-b border-border">
                          <h2 className="font-semibold text-foreground">Per-Student Summary</h2>
                          <p className="text-xs text-muted-foreground mt-0.5">Rate = classes present out of {monthlyAttendance.total_classes} held this month</p>
                        </div>
                        <div className="divide-y divide-border">
                          {monthlyAttendance.students.map((s) => (
                            <div key={s.student_id} className="px-6 py-3 flex items-center gap-4">
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-sm font-semibold text-primary">{s.full_name?.charAt(0) || "?"}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{s.full_name}</p>
                                <p className="text-xs text-muted-foreground">{s.present} present &middot; {s.absent} absent &middot; {s.late} late</p>
                              </div>
                              <div className="flex items-center gap-3 w-40 shrink-0">
                                <div className="flex-1 bg-secondary rounded-full h-2">
                                  <div
                                    className={`rounded-full h-2 transition-all ${s.rate >= 75 ? "bg-emerald-500" : s.rate >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                                    style={{ width: `${Math.min(s.rate, 100)}%` }}
                                  />
                                </div>
                                <span className="text-sm font-semibold text-foreground w-12 text-right">{s.rate.toFixed(0)}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Exam */}
      {activeTab === "exam" && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-foreground">Exams ({exams.length})</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Exams for this batch&apos;s course</p>
            </div>
            <button
              onClick={openCreateExam}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-medium text-xs shadow-primary hover:shadow-lg transition-all shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Exam
            </button>
          </div>
          {exams.length === 0 ? (
            <div className="py-12 text-center">
              <GraduationCap className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No exams for this course yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {exams.map((e) => (
                <button
                  key={e.id}
                  onClick={() => router.push(`/admin/exams/${e.id}`)}
                  className="w-full flex items-center justify-between px-6 py-3 hover:bg-secondary/50 text-left transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{e.title}</p>
                    <p className="text-xs text-muted-foreground">{e.date} &middot; {e.total_questions} questions &middot; {e.total_marks} marks</p>
                  </div>
                  {e.is_live && (
                    <span className="px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-bold animate-pulse">LIVE</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create exam modal */}
      {showExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-lg-custom max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
              <h2 className="text-lg font-semibold text-foreground">Create Exam</h2>
              <button
                onClick={() => setShowExamModal(false)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <p className="text-xs text-muted-foreground -mt-1">
                For {batch?.name} &middot; {course?.title || batch?.course_name}
              </p>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Title *</label>
                <input
                  value={examForm.title}
                  onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g. Mid-term Exam"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Date *</label>
                  <input
                    type="date"
                    value={examForm.date}
                    onChange={(e) => setExamForm({ ...examForm, date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Time *</label>
                  <input
                    type="time"
                    value={examForm.time}
                    onChange={(e) => setExamForm({ ...examForm, time: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Duration *</label>
                  <input
                    value={examForm.duration}
                    onChange={(e) => setExamForm({ ...examForm, duration: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g. 60 min"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Marks</label>
                  <input
                    type="number"
                    min={0}
                    value={examForm.total_marks}
                    onChange={(e) => setExamForm({ ...examForm, total_marks: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="e.g. 100"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                You&apos;ll add questions (manually or from the question bank) on the next screen.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-border shrink-0">
              <button
                onClick={() => setShowExamModal(false)}
                className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateExam}
                disabled={savingExam}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-semibold shadow-primary hover:shadow-lg disabled:opacity-50 flex items-center gap-2 transition-all"
              >
                {savingExam && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notice */}
      {activeTab === "notice" && (
        <div className="space-y-6">
          <div className="bg-card rounded-2xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Send Notice to Batch</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Title</label>
                <input
                  type="text"
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  placeholder="Notice title"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Message</label>
                <textarea
                  value={noticeBody}
                  onChange={(e) => setNoticeBody(e.target.value)}
                  rows={3}
                  placeholder="Notice message..."
                  className={`${inputClass} resize-none`}
                />
              </div>
              <button
                onClick={handleSendNotice}
                disabled={noticeSending}
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
              >
                {noticeSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {noticeSending ? "Sending..." : "Send Notice"}
              </button>
              {noticeResult && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
                    noticeResult.success
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {noticeResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {noticeResult.message}
                </div>
              )}
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Sent Notices ({notices.length})</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Push notifications sent to this batch</p>
            </div>
            {noticesLoading ? (
              <div className="py-12 text-center text-muted-foreground">Loading...</div>
            ) : notices.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No notices sent to this batch yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notices.map((n) => (
                  <div key={n.id} className="flex items-start justify-between gap-4 px-6 py-3 hover:bg-secondary/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{n.body}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatNoticeDate(n.sent_at)}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteNotice(n.id)}
                      disabled={deletingNoticeId === n.id}
                      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 shrink-0"
                    >
                      {deletingNoticeId === n.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Teacher */}
      {activeTab === "teacher" && (
        <div className="space-y-6">
          {course && (course.teacher || course.instructors) && (
            <div className="bg-card rounded-2xl border border-border p-6">
              <div className="space-y-4">
                {course.teacher && (
                  <div>
                    <p className="text-xs text-muted-foreground">Lead Teacher</p>
                    <p className="text-sm font-medium text-foreground">{course.teacher}</p>
                  </div>
                )}
                {course.instructors && (
                  <div>
                    <p className="text-xs text-muted-foreground">Instructors</p>
                    <p className="text-sm font-medium text-foreground">{course.instructors}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-semibold text-foreground">Assigned Teachers</h3>
                <p className="text-xs text-muted-foreground">Teachers with portal access to this batch (attendance, lessons, exams, results, doubts)</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="px-3 py-2 pr-8 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none bg-no-repeat bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%2210%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b7280%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22></polyline></svg>)] bg-[position:right_0.6rem_center]"
                >
                  <option value="">Select a teacher...</option>
                  {allTeachers
                    .filter((t) => !batchTeachers.some((bt) => bt.id === t.id))
                    .map((t) => (
                      <option key={t.id} value={t.id}>{t.full_name} ({t.email})</option>
                    ))}
                </select>
                <button
                  onClick={handleAssignTeacher}
                  disabled={!selectedTeacherId || assigningTeacher}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {assigningTeacher ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Assign
                </button>
              </div>
            </div>

            {batchTeachersLoading ? (
              <div className="py-12 text-center text-muted-foreground">Loading...</div>
            ) : batchTeachers.length === 0 ? (
              <div className="py-12 text-center">
                <GraduationCap className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No teacher assigned to this batch yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {batchTeachers.map((t) => (
                  <div key={t.id} className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">{t.full_name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{t.full_name}</p>
                        <p className="text-xs text-muted-foreground">{t.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnassignTeacher(t.id)}
                      disabled={unassigningTeacherId === t.id}
                      title="Unassign from batch"
                      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 shrink-0"
                    >
                      {unassigningTeacherId === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {activeTab === "leaderboard" && (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <Trophy className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Leaderboard is coming soon</p>
        </div>
      )}

      {/* Remove Student Confirmation Modal */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setConfirmRemove(null)}>
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Remove Student</h3>
              <button onClick={() => setConfirmRemove(null)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted-foreground">
                Remove <strong className="text-foreground">{confirmRemove.full_name || "this student"}</strong> from this batch? Their account and history in other batches will not be affected.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setConfirmRemove(null)} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
              <button
                onClick={handleRemoveStudent}
                disabled={removingId === confirmRemove.id}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive text-white text-sm font-medium hover:bg-destructive/90 disabled:opacity-50 transition-all"
              >
                {removingId === confirmRemove.id && <Loader2 className="w-4 h-4 animate-spin" />}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
