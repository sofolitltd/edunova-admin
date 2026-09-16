"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getToken, isAuthenticated } from "@/lib/auth";
import {
  calendarApi,
  api,
  batchApi,
  type CalendarEvent,
  type Course,
  type Batch,
} from "@/lib/api";
import { toast } from "sonner";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  X,
  Clock,
  GraduationCap,
  PartyPopper,
  Layers,
  Loader2,
} from "lucide-react";

const EVENT_TYPES = [
  { value: "exam", label: "Exam", color: "bg-red-500" },
  { value: "holiday", label: "Holiday", color: "bg-amber-500" },
  { value: "class_test", label: "Class Test", color: "bg-blue-500" },
  { value: "other", label: "Other", color: "bg-gray-400" },
] as const;

const EVENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  exam: <GraduationCap className="w-4 h-4" />,
  holiday: <PartyPopper className="w-4 h-4" />,
  class_test: <Layers className="w-4 h-4" />,
  other: <Clock className="w-4 h-4" />,
};

const COLOR_OPTIONS = [
  { value: "#ef4444", label: "Red" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#10b981", label: "Emerald" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#ec4899", label: "Pink" },
  { value: "#6b7280", label: "Gray" },
  { value: "#06b6d4", label: "Cyan" },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface EventForm {
  title: string;
  description: string;
  event_type: string;
  date: string;
  end_date: string;
  course_id: number | null;
  batch_id: number | null;
  color: string;
}

const emptyForm: EventForm = {
  title: "",
  description: "",
  event_type: "exam",
  date: "",
  end_date: "",
  course_id: null,
  batch_id: null,
  color: "#3b82f6",
};

export default function CalendarPage() {
  const router = useRouter();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);

  const monthParam = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;

  const loadEvents = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const data = await calendarApi.getEvents(token, monthParam);
      setEvents(data);
    } catch {
      toast.error("Failed to load calendar events");
    } finally {
      setLoading(false);
    }
  }, [monthParam]);

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

  const loadBatches = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await batchApi.getBatches(token);
      setBatches(data);
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/admin/login");
      return;
    }
  }, [router]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    loadCourses();
    loadBatches();
  }, [loadCourses, loadBatches]);

  const filteredBatches = form.course_id
    ? batches.filter((b) => b.course_id === form.course_id)
    : batches;

  const getEventsForDay = (day: number): CalendarEvent[] => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((e) => e.date === dateStr);
  };

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const goToPrevMonth = () => {
    setSelectedDay(null);
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    setSelectedDay(null);
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDay(today.getDate());
  };

  const openCreateForm = (day?: number) => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      date:
        day !== undefined
          ? `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          : "",
    });
    setShowForm(true);
  };

  const openEditForm = (event: CalendarEvent) => {
    setEditingId(event.id);
    setForm({
      title: event.title,
      description: event.description,
      event_type: event.event_type,
      date: event.date,
      end_date: event.end_date || "",
      course_id: event.course_id || null,
      batch_id: event.batch_id || null,
      color: event.color || "#3b82f6",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.date) {
      toast.error("Date is required");
      return;
    }
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        event_type: form.event_type,
        date: form.date,
        end_date: form.end_date || undefined,
        course_id: form.course_id || undefined,
        batch_id: form.batch_id || undefined,
        color: form.color,
      };
      if (editingId) {
        await calendarApi.updateEvent(token, editingId, payload);
        toast.success("Event updated");
      } else {
        await calendarApi.createEvent(token, payload);
        toast.success("Event created");
      }
      closeForm();
      loadEvents();
    } catch {
      toast.error(editingId ? "Failed to update event" : "Failed to create event");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this event?")) return;
    const token = getToken();
    if (!token) return;
    setDeleting(id);
    try {
      await calendarApi.deleteEvent(token, id);
      toast.success("Event deleted");
      loadEvents();
    } catch {
      toast.error("Failed to delete event");
    } finally {
      setDeleting(null);
    }
  };

  const getEventDotColor = (eventType: string): string => {
    switch (eventType) {
      case "exam":
        return "bg-red-500";
      case "holiday":
        return "bg-amber-500";
      case "class_test":
        return "bg-blue-500";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage exams, holidays, and class events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-secondary text-muted-foreground rounded-xl text-sm font-medium hover:text-foreground transition-all"
          >
            Today
          </button>
          <button
            onClick={() => openCreateForm()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Event
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar Grid */}
        <div className="flex-1">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {/* Month Navigation */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <button
                onClick={goToPrevMonth}
                className="p-2 hover:bg-secondary rounded-xl transition-all"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              <h2 className="text-lg font-semibold text-foreground">
                {MONTHS[currentMonth]} {currentYear}
              </h2>
              <button
                onClick={goToNextMonth}
                className="p-2 hover:bg-secondary rounded-xl transition-all"
              >
                <ChevronRight className="w-5 h-5 text-foreground" />
              </button>
            </div>

            {/* Day Labels */}
            <div className="grid grid-cols-7 border-b border-border">
              {DAY_LABELS.map((day) => (
                <div
                  key={day}
                  className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground uppercase"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            {loading ? (
              <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading events...
              </div>
            ) : (
              <div className="grid grid-cols-7">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="min-h-[80px] sm:min-h-[100px] border-b border-r border-border bg-secondary/30"
                  />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dayEvents = getEventsForDay(day);
                  const isToday =
                    day === today.getDate() &&
                    currentMonth === today.getMonth() &&
                    currentYear === today.getFullYear();
                  const isSelected = day === selectedDay;

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`min-h-[80px] sm:min-h-[100px] border-b border-r border-border p-1.5 text-left transition-all hover:bg-secondary/50 ${
                        isSelected
                          ? "bg-primary/10 ring-2 ring-primary ring-inset"
                          : ""
                      }`}
                    >
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium ${
                          isToday
                            ? "bg-primary text-white"
                            : "text-foreground"
                        }`}
                      >
                        {day}
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <div
                            key={ev.id}
                            className="flex items-center gap-1 rounded px-1 py-0.5"
                            title={ev.title}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${getEventDotColor(
                                ev.event_type
                              )}`}
                            />
                            <span className="text-[10px] sm:text-xs text-foreground truncate">
                              {ev.title}
                            </span>
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[10px] text-muted-foreground px-1">
                            +{dayEvents.length - 3} more
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
                {/* Trailing empty cells */}
                {Array.from({
                  length:
                    (7 - ((firstDayOfWeek + daysInMonth) % 7)) % 7,
                }).map((_, i) => (
                  <div
                    key={`trail-${i}`}
                    className="min-h-[80px] sm:min-h-[100px] border-b border-r border-border bg-secondary/30"
                  />
                ))}
              </div>
            )}

            {/* Legend */}
            <div className="px-6 py-3 border-t border-border flex flex-wrap items-center gap-4">
              {EVENT_TYPES.map((t) => (
                <div key={t.value} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
                  <span className="text-xs text-muted-foreground">
                    {t.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Side Panel: Day Events */}
        <div className="w-full lg:w-80 xl:w-96 shrink-0">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">
                {selectedDay
                  ? `${MONTHS[currentMonth]} ${selectedDay}, ${currentYear}`
                  : "Select a day"}
              </h3>
              {selectedDay && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedDayEvents.length} event
                  {selectedDayEvents.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>

            <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
              {!selectedDay ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Click on a day to view its events
                </p>
              ) : selectedDayEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No events on this day
                  </p>
                  <button
                    onClick={() => openCreateForm(selectedDay)}
                    className="mt-3 text-sm text-primary hover:underline"
                  >
                    + Add an event
                  </button>
                </div>
              ) : (
                selectedDayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="bg-secondary/50 border border-border rounded-xl p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="p-1.5 rounded-lg text-white"
                          style={{ backgroundColor: event.color || "#3b82f6" }}
                        >
                          {EVENT_TYPE_ICONS[event.event_type] || (
                            <Clock className="w-4 h-4" />
                          )}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-foreground leading-tight">
                            {event.title}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {event.event_type.replace("_", " ")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openEditForm(event)}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(event.id)}
                          disabled={deleting === event.id}
                          className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all disabled:opacity-50"
                        >
                          {deleting === event.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                    {event.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 pl-8">
                        {event.description}
                      </p>
                    )}
                    {event.course_name && (
                      <div className="pl-8">
                        <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          {event.course_name}
                          {event.batch_name ? ` — ${event.batch_name}` : ""}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit Event Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                {editingId ? "Edit Event" : "New Event"}
              </h3>
              <button
                onClick={closeForm}
                className="p-2 hover:bg-secondary rounded-xl transition-all"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Title *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  placeholder="e.g. Midterm Exam"
                  className="w-full px-3 py-2 border border-border rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Optional description..."
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              {/* Event Type + Date row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Event Type *
                  </label>
                  <select
                    value={form.event_type}
                    onChange={(e) =>
                      setForm({ ...form, event_type: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) =>
                      setForm({ ...form, date: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-border rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  End Date{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) =>
                    setForm({ ...form, end_date: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Course + Batch row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Course
                  </label>
                  <select
                    value={form.course_id ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        course_id: e.target.value
                          ? Number(e.target.value)
                          : null,
                        batch_id: null,
                      })
                    }
                    className="w-full px-3 py-2 border border-border rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">None</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Batch
                  </label>
                  <select
                    value={form.batch_id ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        batch_id: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                    className="w-full px-3 py-2 border border-border rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={!form.course_id}
                  >
                    <option value="">None</option>
                    {filteredBatches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Color
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setForm({ ...form, color: c.value })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        form.color === c.value
                          ? "border-foreground scale-110"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={closeForm}
                className="px-4 py-2 bg-secondary text-muted-foreground rounded-xl text-sm font-medium hover:text-foreground transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-all disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Calendar className="w-4 h-4" />
                )}
                {editingId ? "Update Event" : "Create Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
