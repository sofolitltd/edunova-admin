"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getToken, isAuthenticated, getLoginPath } from "@/lib/auth";
import { attendanceApi, type User, type AttendanceRecord, type AttendanceReport, type Holiday } from "@/lib/api";
import { useBatchFilter } from "@/hooks/useBatchFilter";
import { BatchFilterSelect } from "@/components/BatchFilterSelect";
import { Calendar, CheckCircle, XCircle, Clock, Save, Plus, Trash2, Loader2, BarChart3 } from "lucide-react";
import { toast } from "sonner";

export default function AttendancePage() {
  const router = useRouter();
  const pathname = usePathname();
  const { isTeacherPortal, batches, selectedBatchId, setSelectedBatchId, batchIdNum } = useBatchFilter();
  const [students, setStudents] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [marks, setMarks] = useState<Record<number, { status: string; notes: string }>>({});
  const [activeTab, setActiveTab] = useState<"mark" | "report" | "holidays">("mark");

  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ date: "", reason: "" });
  const [savingHoliday, setSavingHoliday] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { router.push(getLoginPath(pathname)); return; }
  }, [router, pathname]);

  const loadStudents = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await attendanceApi.getStudents(token, batchIdNum);
      setStudents(data);
    } catch {
      toast.error("Failed to load students");
    }
  }, [batchIdNum]);

  const loadAttendance = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const [attData, reportData] = await Promise.all([
        attendanceApi.getAttendance(token, selectedDate, batchIdNum ? String(batchIdNum) : undefined),
        attendanceApi.getReport(token, selectedDate, batchIdNum ? String(batchIdNum) : undefined),
      ]);
      setAttendance(attData);
      setReport(reportData);

      const existingMarks: Record<number, { status: string; notes: string }> = {};
      attData.forEach((a) => {
        existingMarks[a.student_id] = { status: a.status, notes: a.notes };
      });
      setMarks(existingMarks);
    } catch {
      toast.error("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, batchIdNum]);

  const loadHolidays = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await attendanceApi.getHolidays(token);
      setHolidays(data);
    } catch {
      toast.error("Failed to load holidays");
    }
  }, []);

  useEffect(() => { loadStudents(); loadHolidays(); }, [loadStudents, loadHolidays]);
  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  const setMark = (studentId: number, status: string) => {
    setMarks((prev) => ({
      ...prev,
      [studentId]: { status, notes: prev[studentId]?.notes || "" },
    }));
  };

  const setNote = (studentId: number, notes: string) => {
    setMarks((prev) => ({
      ...prev,
      [studentId]: { status: prev[studentId]?.status || "present", notes },
    }));
  };

  const handleSaveAttendance = async () => {
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      const entries = Object.entries(marks).map(([id, m]) => ({
        student_id: Number(id),
        status: m.status,
        notes: m.notes,
      }));
      const result = await attendanceApi.markAttendance(token, { date: selectedDate, entries });
      toast.success(result.message);
      loadAttendance();
    } catch {
      toast.error("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateHoliday = async () => {
    if (!holidayForm.date) { toast.error("Date is required"); return; }
    const token = getToken();
    if (!token) return;
    setSavingHoliday(true);
    try {
      await attendanceApi.createHoliday(token, holidayForm);
      toast.success("Holiday created");
      setHolidayForm({ date: "", reason: "" });
      setShowHolidayForm(false);
      loadHolidays();
    } catch {
      toast.error("Failed to create holiday");
    } finally {
      setSavingHoliday(false);
    }
  };

  const handleDeleteHoliday = async (id: number) => {
    const token = getToken();
    if (!token) return;
    try {
      await attendanceApi.deleteHoliday(token, id);
      toast.success("Holiday deleted");
      loadHolidays();
    } catch {
      toast.error("Failed to delete holiday");
    }
  };

  const statusColors = {
    present: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    absent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    late: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
          <p className="text-sm text-muted-foreground mt-1">Mark daily attendance and manage holidays</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("mark")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === "mark" ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
          >
            Mark Attendance
          </button>
          <button
            onClick={() => setActiveTab("report")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === "report" ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
          >
            Report
          </button>
          <button
            onClick={() => setActiveTab("holidays")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === "holidays" ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
          >
            Holidays
          </button>
        </div>
      </div>

      {/* Date Picker + Batch Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <Calendar className="w-5 h-5 text-muted-foreground" />
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 border border-border rounded-xl bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {selectedDate === today && (
          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-lg">Today</span>
        )}
        <BatchFilterSelect batches={batches} value={selectedBatchId} onChange={setSelectedBatchId} isTeacherPortal={isTeacherPortal} />
      </div>

      {/* Report Cards */}
      {report && activeTab === "mark" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold text-foreground">{report.total}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Present</p>
            <p className="text-2xl font-bold text-emerald-600">{report.present}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Absent</p>
            <p className="text-2xl font-bold text-red-600">{report.absent}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Rate</p>
            <p className="text-2xl font-bold text-primary">{report.attendance_rate.toFixed(1)}%</p>
          </div>
        </div>
      )}

      {/* Mark Attendance Tab */}
      {activeTab === "mark" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Students ({students.length})</h2>
            <button
              onClick={handleSaveAttendance}
              disabled={saving || Object.keys(marks).length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Attendance
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No students found</div>
          ) : (
            <div className="divide-y divide-border">
              {students.map((student) => {
                const mark = marks[student.id];
                const status = mark?.status || "";
                return (
                  <div key={student.id} className="px-6 py-3 flex items-center gap-4 hover:bg-secondary/50 transition-all">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-sm font-bold text-white shrink-0">
                      {student.full_name?.[0]?.toUpperCase() || "S"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{student.full_name}</p>
                      <p className="text-xs text-muted-foreground">{student.mobile}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setMark(student.id, "present")}
                        className={`p-2 rounded-xl transition-all ${status === "present" ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "text-muted-foreground hover:bg-secondary"}`}
                        title="Present"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setMark(student.id, "absent")}
                        className={`p-2 rounded-xl transition-all ${status === "absent" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "text-muted-foreground hover:bg-secondary"}`}
                        title="Absent"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setMark(student.id, "late")}
                        className={`p-2 rounded-xl transition-all ${status === "late" ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" : "text-muted-foreground hover:bg-secondary"}`}
                        title="Late"
                      >
                        <Clock className="w-5 h-5" />
                      </button>
                      {status && (
                        <span className={`text-xs font-medium px-2 py-1 rounded-lg ${statusColors[status as keyof typeof statusColors]}`}>
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
      )}

      {/* Report Tab */}
      {activeTab === "report" && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="w-6 h-6 text-primary" />
            <h2 className="font-semibold text-foreground">Attendance Report — {selectedDate}</h2>
          </div>
          {report ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-secondary rounded-xl">
                  <p className="text-3xl font-bold text-foreground">{report.total}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Students</p>
                </div>
                <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                  <p className="text-3xl font-bold text-emerald-600">{report.present}</p>
                  <p className="text-xs text-muted-foreground mt-1">Present</p>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                  <p className="text-3xl font-bold text-red-600">{report.absent}</p>
                  <p className="text-xs text-muted-foreground mt-1">Absent</p>
                </div>
                <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                  <p className="text-3xl font-bold text-amber-600">{report.late}</p>
                  <p className="text-xs text-muted-foreground mt-1">Late</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Attendance Rate</span>
                  <span className="font-semibold text-foreground">{report.attendance_rate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-3">
                  <div
                    className="bg-primary rounded-full h-3 transition-all"
                    style={{ width: `${Math.min(report.attendance_rate, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No report data for this date</p>
          )}
        </div>
      )}

      {/* Holidays Tab */}
      {activeTab === "holidays" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowHolidayForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Holiday
            </button>
          </div>

          {showHolidayForm && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="font-semibold text-foreground mb-4">New Holiday</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="date"
                  value={holidayForm.date}
                  onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                  className="px-3 py-2 border border-border rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="text"
                  placeholder="Reason (optional)"
                  value={holidayForm.reason}
                  onChange={(e) => setHolidayForm({ ...holidayForm, reason: e.target.value })}
                  className="flex-1 px-3 py-2 border border-border rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={handleCreateHoliday}
                  disabled={savingHoliday}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-all disabled:opacity-50"
                >
                  {savingHoliday ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => { setShowHolidayForm(false); setHolidayForm({ date: "", reason: "" }); }}
                  className="px-4 py-2 bg-secondary text-muted-foreground rounded-xl text-sm font-medium hover:text-foreground transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {holidays.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No holidays configured</div>
            ) : (
              <div className="divide-y divide-border">
                {holidays.map((h) => (
                  <div key={h.id} className="px-6 py-3 flex items-center justify-between hover:bg-secondary/50 transition-all">
                    <div>
                      <p className="text-sm font-medium text-foreground">{new Date(h.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                      {h.reason && <p className="text-xs text-muted-foreground mt-0.5">{h.reason}</p>}
                    </div>
                    <button
                      onClick={() => handleDeleteHoliday(h.id)}
                      className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
