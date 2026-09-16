"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, type Course, type CreateCoursePayload, type CurriculumMonth } from "@/lib/api";
import { getToken } from "@/lib/auth";
import {
  Plus,
  Pencil,
  Trash2,
  Trash2Icon,
  BookOpen,
  X,
  Loader2,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";

const defaultForm: CreateCoursePayload = {
  title: "",
  title_bn: "",
  description: "",
  subject: "",
  teacher: "",
  instructors: "",
  class_level: "",
  type: "offline",
  schedule: "",
  color: "#6366F1",
  gradient: "from-primary to-primary-dark",
  price: 0,
  old_price: 0,
  duration: "",
  badge: "",
  students_count: 0,
  classes_count: 0,
  exams_count: 0,
  rating: 0,
  reviews_count: 0,
  curriculum: [],
  features: [],
};

const colorOptions = ["#6366F1", "#10B981", "#F472B6", "#F59E0B", "#EF4444", "#3B82F6"];

const gradientOptions = [
  { label: "Indigo", value: "from-primary to-primary-dark" },
  { label: "Emerald", value: "from-success to-emerald-600" },
  { label: "Pink", value: "from-accent to-pink-500" },
  { label: "Amber", value: "from-warning to-amber-600" },
  { label: "Red", value: "from-red-500 to-red-600" },
  { label: "Blue", value: "from-blue-500 to-blue-600" },
];

const badgeOptions = ["", "Popular", "New", "Hot", "Best Value", "Early Bird"];

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CreateCoursePayload>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [newFeature, setNewFeature] = useState("");
  const [newMonthTitle, setNewMonthTitle] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [editingMonthIdx, setEditingMonthIdx] = useState<number | null>(null);

  const fetchCourses = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.push("/admin/login");
      return;
    }
    try {
      const data = await api.getCourses(token);
      setCourses(data);
    } catch {
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setShowModal(true);
  };

  const openEdit = (course: Course) => {
    setEditingId(course.id);
    setForm({
      title: course.title,
      title_bn: course.title_bn || "",
      description: course.description,
      subject: course.subject,
      teacher: course.teacher,
      instructors: course.instructors || "",
      class_level: course.class_level || "",
      type: course.type || "offline",
      schedule: course.schedule,
      color: course.color,
      gradient: course.gradient || "from-primary to-primary-dark",
      price: course.price || 0,
      old_price: course.old_price || 0,
      duration: course.duration || "",
      badge: course.badge || "",
      students_count: course.students_count || 0,
      classes_count: course.classes_count || 0,
      exams_count: course.exams_count || 0,
      rating: course.rating || 0,
      reviews_count: course.reviews_count || 0,
      curriculum: Array.isArray(course.curriculum) ? course.curriculum : [],
      features: Array.isArray(course.features) ? course.features : [],
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.subject || !form.teacher) {
      toast.error("Title, subject, and teacher are required");
      return;
    }
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      if (editingId) {
        const updated = await api.updateCourse(token, editingId, form);
        setCourses((prev) => prev.map((c) => (c.id === editingId ? updated : c)));
        toast.success("Course updated");
      } else {
        const created = await api.createCourse(token, form);
        setCourses((prev) => [created, ...prev]);
        toast.success("Course created");
      }
      setShowModal(false);
    } catch {
      toast.error("Failed to save course");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Delete course "${title}"? This cannot be undone.`)) return;
    const token = getToken();
    if (!token) return;
    try {
      await api.deleteCourse(token, id);
      setCourses((prev) => prev.filter((c) => c.id !== id));
      toast.success("Course deleted");
    } catch {
      toast.error("Failed to delete course");
    }
  };

  const addFeature = () => {
    if (!newFeature.trim()) return;
    setForm({ ...form, features: [...form.features, newFeature.trim()] });
    setNewFeature("");
  };

  const removeFeature = (idx: number) => {
    setForm({ ...form, features: form.features.filter((_, i) => i !== idx) });
  };

  const addMonth = () => {
    if (!newMonthTitle.trim()) return;
    setForm({
      ...form,
      curriculum: [...form.curriculum, { month: newMonthTitle.trim(), topics: [] }],
    });
    setNewMonthTitle("");
  };

  const removeMonth = (idx: number) => {
    setForm({
      ...form,
      curriculum: form.curriculum.filter((_, i) => i !== idx),
    });
  };

  const addTopic = (monthIdx: number) => {
    if (!newTopic.trim()) return;
    const updated = [...form.curriculum];
    updated[monthIdx] = {
      ...updated[monthIdx],
      topics: [...updated[monthIdx].topics, newTopic.trim()],
    };
    setForm({ ...form, curriculum: updated });
    setNewTopic("");
  };

  const removeTopic = (monthIdx: number, topicIdx: number) => {
    const updated = [...form.curriculum];
    updated[monthIdx] = {
      ...updated[monthIdx],
      topics: updated[monthIdx].topics.filter((_, i) => i !== topicIdx),
    };
    setForm({ ...form, curriculum: updated });
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Courses</h1>
          <p className="text-muted-foreground mt-1">Manage your courses</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold text-sm shadow-primary hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Course
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center shadow-sm-custom">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No courses yet. Create your first course.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-card rounded-2xl border border-border p-6 shadow-sm-custom hover:shadow-md-custom transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${course.color}20` }}
                  >
                    <BookOpen className="w-5 h-5" style={{ color: course.color }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{course.title}</h3>
                    <p className="text-xs text-muted-foreground">{course.subject}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(course)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(course.id, course.title)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Teacher</span>
                  <span className="text-foreground font-medium">{course.teacher}</span>
                </div>
                {course.price > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Price</span>
                    <span className="text-foreground font-medium">৳{course.price.toLocaleString()}</span>
                  </div>
                )}
                {course.duration && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Duration</span>
                    <span className="text-foreground font-medium">{course.duration}</span>
                  </div>
                )}
                {course.badge && (
                  <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {course.badge}
                  </span>
                )}
              </div>
              {course.description && (
                <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                  {course.description}
                </p>
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
                {editingId ? "Edit Course" : "Create Course"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Basic Info */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={inputClass}
                  placeholder="e.g. SSC 2027 Final Preparation Course (FPC-27)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Bengali Title</label>
                <input
                  value={form.title_bn}
                  onChange={(e) => setForm({ ...form, title_bn: e.target.value })}
                  className={inputClass}
                  placeholder="e.g. এসএসসি ২০২৭ চূড়ান্ত প্রস্তুতি কোর্স (FPC-27)"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Subject *</label>
                  <input
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className={inputClass}
                    placeholder="e.g. Science"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Teacher *</label>
                  <input
                    value={form.teacher}
                    onChange={(e) => setForm({ ...form, teacher: e.target.value })}
                    className={inputClass}
                    placeholder="e.g. Md Towfiqure Rehman"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Instructors</label>
                  <input
                    value={form.instructors}
                    onChange={(e) => setForm({ ...form, instructors: e.target.value })}
                    className={inputClass}
                    placeholder="Comma-separated, e.g. Teacher A, Teacher B"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Class Level</label>
                  <select
                    value={form.class_level}
                    onChange={(e) => setForm({ ...form, class_level: e.target.value })}
                    className={`${inputClass} pr-10 appearance-none bg-no-repeat bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b7280%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22></polyline></svg>)] bg-[position:right_0.75rem_center]`}
                  >
                    <option value="">Select class</option>
                    <option value="3">Class 3</option>
                    <option value="4">Class 4</option>
                    <option value="5">Class 5</option>
                    <option value="6">Class 6</option>
                    <option value="7">Class 7</option>
                    <option value="8">Class 8</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Course Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className={`${inputClass} pr-10 appearance-none bg-no-repeat bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b7280%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22></polyline></svg>)] bg-[position:right_0.75rem_center]`}
                  >
                    <option value="offline">Offline (Coaching)</option>
                    <option value="online">Online</option>
                    <option value="free">Free</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Schedule</label>
                  <input
                    value={form.schedule}
                    onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                    className={inputClass}
                    placeholder="e.g. Sat-Wed, 10:00 AM"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Duration</label>
                  <input
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    className={inputClass}
                    placeholder="e.g. 4 Months"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className={`${inputClass} resize-none`}
                  placeholder="Full course description..."
                />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Price (৳)</label>
                  <input
                    type="number"
                    value={form.price || ""}
                    onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                    className={inputClass}
                    placeholder="1399"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Old Price (৳)</label>
                  <input
                    type="number"
                    value={form.old_price || ""}
                    onChange={(e) => setForm({ ...form, old_price: Number(e.target.value) })}
                    className={inputClass}
                    placeholder="1999"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Badge</label>
                  <select
                    value={form.badge}
                    onChange={(e) => setForm({ ...form, badge: e.target.value })}
                    className={inputClass}
                  >
                    {badgeOptions.map((b) => (
                      <option key={b} value={b}>{b || "(none)"}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Students</label>
                  <input
                    type="number"
                    value={form.students_count || ""}
                    onChange={(e) => setForm({ ...form, students_count: Number(e.target.value) })}
                    className={inputClass}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Classes</label>
                  <input
                    type="number"
                    value={form.classes_count || ""}
                    onChange={(e) => setForm({ ...form, classes_count: Number(e.target.value) })}
                    className={inputClass}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Exams</label>
                  <input
                    type="number"
                    value={form.exams_count || ""}
                    onChange={(e) => setForm({ ...form, exams_count: Number(e.target.value) })}
                    className={inputClass}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Rating (0-5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={form.rating || ""}
                    onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                    className={inputClass}
                    placeholder="4.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Reviews Count</label>
                  <input
                    type="number"
                    value={form.reviews_count || ""}
                    onChange={(e) => setForm({ ...form, reviews_count: Number(e.target.value) })}
                    className={inputClass}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Color & Gradient */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Color</label>
                <div className="flex gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setForm({ ...form, color })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        form.color === color
                          ? "border-foreground scale-110"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Gradient</label>
                <div className="flex gap-2 flex-wrap">
                  {gradientOptions.map((g) => (
                    <button
                      key={g.value}
                      onClick={() => setForm({ ...form, gradient: g.value })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r ${g.value} text-white transition-all ${
                        form.gradient === g.value ? "ring-2 ring-foreground ring-offset-2 ring-offset-card" : ""
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Features</label>
                <div className="flex gap-2 mb-2">
                  <input
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
                    className={`${inputClass} flex-1`}
                    placeholder="Add a feature..."
                  />
                  <button
                    type="button"
                    onClick={addFeature}
                    className="px-3 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                  >
                    Add
                  </button>
                </div>
                {form.features.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.features.map((f, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary text-sm text-foreground"
                      >
                        {f}
                        <button
                          onClick={() => removeFeature(i)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Curriculum */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Curriculum</label>
                <div className="flex gap-2 mb-3">
                  <input
                    value={newMonthTitle}
                    onChange={(e) => setNewMonthTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMonth())}
                    className={`${inputClass} flex-1`}
                    placeholder="e.g. Month 1 - Algebra Basics"
                  />
                  <button
                    type="button"
                    onClick={addMonth}
                    className="px-3 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                  >
                    Add Month
                  </button>
                </div>
                {form.curriculum.length > 0 && (
                  <div className="space-y-3">
                    {form.curriculum.map((month, mIdx) => (
                      <div key={mIdx} className="border border-border rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <GripVertical className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-foreground text-sm">{month.month}</span>
                          </div>
                          <button
                            onClick={() => removeMonth(mIdx)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2Icon className="w-4 h-4" />
                          </button>
                        </div>
                        {month.topics.length > 0 && (
                          <div className="ml-6 mb-2 space-y-1">
                            {month.topics.map((t, tIdx) => (
                              <div key={tIdx} className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>• {t}</span>
                                <button
                                  onClick={() => removeTopic(mIdx, tIdx)}
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        {editingMonthIdx === mIdx ? (
                          <div className="ml-6 flex gap-2">
                            <input
                              value={newTopic}
                              onChange={(e) => setNewTopic(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addTopic(mIdx);
                                  setEditingMonthIdx(null);
                                }
                                if (e.key === "Escape") setEditingMonthIdx(null);
                              }}
                              className={`${inputClass} flex-1 text-sm`}
                              placeholder="Add topic..."
                              autoFocus
                            />
                            <button
                              onClick={() => { addTopic(mIdx); setEditingMonthIdx(null); }}
                              className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium"
                            >
                              Add
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingMonthIdx(mIdx); setNewTopic(""); }}
                            className="ml-6 text-xs text-primary hover:text-primary-dark font-medium"
                          >
                            + Add Topic
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
    </div>
  );
}
