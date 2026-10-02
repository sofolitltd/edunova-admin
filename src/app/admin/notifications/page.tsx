"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getToken, isAuthenticated } from "@/lib/auth";
import { notificationApi, batchApi, type Batch } from "@/lib/api";
import {
  Send,
  Users,
  Smartphone,
  Loader2,
  CheckCircle,
  AlertCircle,
  Bell,
  History,
  Trash2,
  ExternalLink,
  Search,
} from "lucide-react";
import { toast } from "sonner";

type SendTarget = "all" | "batch" | "student";
type Tab = "send" | "history";

interface BatchStudent {
  id: number;
  course_id: number;
  course_name: string;
  full_name: string;
  mobile: string;
  student_id: string;
  user_id: number | null;
  amount: number;
  enrolled_by: string;
  created_at: string;
}

interface Notification {
  id: number;
  title: string;
  body: string;
  target: string;
  target_id: number;
  link_type: string;
  link_id: number;
  sent_by: number;
  sent_at: string;
}

const LINK_TYPES = [
  { value: "", label: "No Link" },
  { value: "exam", label: "Exam" },
  { value: "course", label: "Course" },
  { value: "article", label: "Article" },
  { value: "lesson", label: "Lesson" },
  { value: "calendar", label: "Calendar Event" },
  { value: "doubt", label: "Doubt" },
];

export default function NotificationsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<Tab>("send");
  const [stats, setStats] = useState({
    total_users: 0,
    total_devices: 0,
    android: 0,
    ios: 0,
    total_sent: 0,
  });

  // Send form
  const [target, setTarget] = useState<SendTarget>("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [batchId, setBatchId] = useState<number>(0);
  const [userId, setUserId] = useState<number>(0);
  const [batches, setBatches] = useState<Batch[]>([]);

  // Specific-student target: batch -> searchable student dropdown
  const [studentBatchId, setStudentBatchId] = useState<number>(0);
  const [batchStudents, setBatchStudents] = useState<BatchStudent[]>([]);
  const [batchStudentsLoading, setBatchStudentsLoading] = useState(false);
  const [studentQuery, setStudentQuery] = useState("");
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<BatchStudent | null>(
    null
  );
  const [linkType, setLinkType] = useState("");
  const [linkId, setLinkId] = useState<number>(0);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    total?: number;
  } | null>(null);

  // History
  const [history, setHistory] = useState<Notification[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const [statsData, batchesData] = await Promise.all([
        notificationApi.getStats(token),
        batchApi.getBatches(token),
      ]);
      setStats(statsData);
      setBatches(batchesData);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async (page = 1, append = false) => {
    const token = getToken();
    if (!token) return;
    setHistoryLoading(true);
    try {
      const data = await notificationApi.getHistory(token, page);
      if (append) {
        setHistory((prev) => [...prev, ...data.notifications]);
      } else {
        setHistory(data.notifications);
      }
      setHistoryTotal(data.total);
      setHistoryPage(page);
    } catch {
      toast.error("Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/admin/login");
      return;
    }
    load();
  }, [load, router]);

  useEffect(() => {
    if (tab === "history") {
      loadHistory(1);
    }
  }, [tab, loadHistory]);

  useEffect(() => {
    setSelectedStudent(null);
    setUserId(0);
    setStudentQuery("");
    setBatchStudents([]);
    if (!studentBatchId) return;
    const token = getToken();
    if (!token) return;
    setBatchStudentsLoading(true);
    batchApi
      .getBatchStudents(token, studentBatchId)
      .then((data) => setBatchStudents(data.filter((s) => s.user_id)))
      .catch(() => toast.error("Failed to load students"))
      .finally(() => setBatchStudentsLoading(false));
  }, [studentBatchId]);

  const filteredStudents = batchStudents.filter((s) => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      s.full_name.toLowerCase().includes(q) ||
      s.student_id.toLowerCase().includes(q) ||
      s.mobile.toLowerCase().includes(q)
    );
  });

  const selectStudent = (s: BatchStudent) => {
    setSelectedStudent(s);
    setUserId(s.user_id as number);
    setStudentQuery(s.full_name);
    setStudentDropdownOpen(false);
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and message are required");
      return;
    }
    if (target === "batch" && !batchId) {
      toast.error("Please select a batch");
      return;
    }
    if (target === "student" && !userId) {
      toast.error("Please select a student");
      return;
    }

    const token = getToken();
    if (!token) return;
    setSending(true);
    setResult(null);

    try {
      const data: {
        title: string;
        body: string;
        all_users?: boolean;
        batch_id?: number;
        user_id?: number;
        link_type?: string;
        link_id?: number;
      } = { title, body };

      if (target === "all") data.all_users = true;
      if (target === "batch") data.batch_id = batchId;
      if (target === "student") data.user_id = userId;
      if (linkType) data.link_type = linkType;
      if (linkId) data.link_id = linkId;

      const res = await notificationApi.send(token, data);
      setResult({ success: true, message: res.message, total: res.total });
      toast.success(`Notification sent`);
      setTitle("");
      setBody("");
      setLinkType("");
      setLinkId(0);
      setStudentBatchId(0);
      setSelectedStudent(null);
      setUserId(0);
      setStudentQuery("");

      // Refresh stats
      const statsData = await notificationApi.getStats(token);
      setStats(statsData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send";
      setResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: number) => {
    const token = getToken();
    if (!token) return;
    try {
      await notificationApi.deleteNotification(token, id);
      setHistory((prev) => prev.filter((n) => n.id !== id));
      setHistoryTotal((prev) => prev - 1);
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString("en-BD");
  };

  const getTargetLabel = (target: string, targetId: number) => {
    switch (target) {
      case "all":
        return "All Users";
      case "batch":
        const batch = batches.find((b) => b.id === targetId);
        return batch ? batch.name : `Batch #${targetId}`;
      case "student":
        return `Student #${targetId}`;
      default:
        return target;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Notifications
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          icon={<Bell className="w-5 h-5" />}
          label="Sent"
          value={stats.total_sent}
          color="text-indigo-500"
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Users"
          value={stats.total_users}
          color="text-blue-500"
        />
        <StatCard
          icon={<Smartphone className="w-5 h-5" />}
          label="Devices"
          value={stats.total_devices}
          color="text-green-500"
        />
        <StatCard
          icon={<Smartphone className="w-5 h-5" />}
          label="Android"
          value={stats.android}
          color="text-emerald-500"
        />
        <StatCard
          icon={<Smartphone className="w-5 h-5" />}
          label="iOS"
          value={stats.ios}
          color="text-gray-500"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("send")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === "send"
              ? "bg-indigo-500 text-white"
              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          }`}
        >
          <Send className="w-4 h-4" />
          Send New
        </button>
        <button
          onClick={() => setTab("history")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            tab === "history"
              ? "bg-indigo-500 text-white"
              : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
          }`}
        >
          <History className="w-4 h-4" />
          History ({historyTotal})
        </button>
      </div>

      {tab === "send" ? (
        /* ── Send Form ── */
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Send Notification
          </h2>

          {/* Target selector */}
          <div className="flex gap-2 mb-4">
            {(
              [
                { key: "all" as SendTarget, label: "All Users" },
                { key: "batch" as SendTarget, label: "By Batch" },
                { key: "student" as SendTarget, label: "Specific Student" },
              ]
            ).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setTarget(opt.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  target === opt.key
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {target === "batch" && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select Batch
              </label>
              <select
                value={batchId}
                onChange={(e) => setBatchId(Number(e.target.value))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value={0}>-- Choose Batch --</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.course_name ? ` — ${b.course_name}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {target === "student" && (
            <div className="mb-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select Batch
                </label>
                <select
                  value={studentBatchId}
                  onChange={(e) => setStudentBatchId(Number(e.target.value))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value={0}>-- Choose Batch --</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                      {b.course_name ? ` — ${b.course_name}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {studentBatchId > 0 && (
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Select Student
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={studentQuery}
                      onChange={(e) => {
                        setStudentQuery(e.target.value);
                        setSelectedStudent(null);
                        setUserId(0);
                        setStudentDropdownOpen(true);
                      }}
                      onFocus={() => setStudentDropdownOpen(true)}
                      onBlur={() =>
                        setTimeout(() => setStudentDropdownOpen(false), 150)
                      }
                      placeholder={
                        batchStudentsLoading
                          ? "Loading students..."
                          : "Search student by name, ID or mobile"
                      }
                      disabled={batchStudentsLoading}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg pl-9 pr-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60"
                    />
                    {batchStudentsLoading && (
                      <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                    )}
                  </div>

                  {studentDropdownOpen && !batchStudentsLoading && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-56 overflow-y-auto bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
                      {filteredStudents.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                          No matching students
                        </p>
                      ) : (
                        filteredStudents.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onMouseDown={() => selectStudent(s)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                          >
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {s.full_name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {s.student_id} · {s.mobile}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {selectedStudent && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-sm text-indigo-700 dark:text-indigo-400">
                  <CheckCircle className="w-4 h-4" />
                  Selected: {selectedStudent.full_name} (
                  {selectedStudent.student_id})
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification title"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Message */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Message
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder="Notification message..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
          </div>

          {/* Deep Link */}
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Deep Link (Optional — tap notification opens this)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Link Type
                </label>
                <select
                  value={linkType}
                  onChange={(e) => {
                    setLinkType(e.target.value);
                    setLinkId(0);
                  }}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  {LINK_TYPES.map((lt) => (
                    <option key={lt.value} value={lt.value}>
                      {lt.label}
                    </option>
                  ))}
                </select>
              </div>
              {linkType && (
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {linkType.charAt(0).toUpperCase() + linkType.slice(1)} ID
                  </label>
                  <input
                    type="number"
                    value={linkId || ""}
                    onChange={(e) => setLinkId(Number(e.target.value))}
                    placeholder={`Enter ${linkType} ID`}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white px-5 py-2.5 rounded-lg font-medium transition"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {sending ? "Sending..." : "Send Notification"}
          </button>

          {result && (
            <div
              className={`mt-4 flex items-center gap-2 p-3 rounded-lg text-sm ${
                result.success
                  ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                  : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
              }`}
            >
              {result.success ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              {result.message}
            </div>
          )}
        </div>
      ) : (
        /* ── History ── */
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          {history.length === 0 && !historyLoading ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No notifications sent yet</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {history.map((notif) => (
                  <div
                    key={notif.id}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900 dark:text-white truncate">
                            {notif.title}
                          </h3>
                          {notif.link_type && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                              <ExternalLink className="w-3 h-3" />
                              {notif.link_type}
                              {notif.link_id ? `#${notif.link_id}` : ""}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {notif.body}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-500">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700">
                            {getTargetLabel(notif.target, notif.target_id)}
                          </span>
                          <span>{formatDate(notif.sent_at)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(notif.id)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {history.length < historyTotal && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => loadHistory(historyPage + 1, true)}
                    disabled={historyLoading}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm text-indigo-500 hover:text-indigo-600"
                  >
                    {historyLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : null}
                    Load more
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-700 ${color}`}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}
