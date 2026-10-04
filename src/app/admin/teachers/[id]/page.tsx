"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getToken, isAuthenticated } from "@/lib/auth";
import { api, type Teacher } from "@/lib/api";
import { teacherDisplayName, type TeacherGender } from "@/lib/teacher";
import { ArrowLeft, Pencil, X, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import ImageUploadField from "@/components/ImageUploadField";

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground whitespace-pre-wrap">{value || "-"}</p>
    </div>
  );
}

const inputClass =
  "w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

type EditForm = {
  full_name: string;
  nickname: string;
  gender: TeacherGender;
  email: string;
  phone: string;
  education: string;
  bio: string;
  address: string;
  photo_url: string;
  join_date: string;
  leave_date: string;
};

export default function TeacherDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const teacherId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return d;
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/admin/login");
      return;
    }
    const token = getToken();
    if (!token || !teacherId) return;

    const load = async () => {
      setLoading(true);
      try {
        const found = await api.getTeacherById(token, teacherId);
        setTeacher(found);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [teacherId, router]);

  const startEditing = () => {
    if (!teacher) return;
    setForm({
      full_name: teacher.full_name,
      nickname: teacher.nickname,
      gender: teacher.gender,
      email: teacher.email,
      phone: teacher.phone,
      education: teacher.education,
      bio: teacher.bio,
      address: teacher.address,
      photo_url: teacher.photo_url,
      join_date: teacher.join_date || "",
      leave_date: teacher.leave_date || "",
    });
    setEditing(true);
  };

  const handleSave = async () => {
    const token = getToken();
    if (!token || !form) return;
    setSaving(true);
    try {
      const updated = await api.updateTeacher(token, teacherId, {
        ...form,
        join_date: form.join_date || null,
        leave_date: form.leave_date || null,
      });
      setTeacher(updated);
      setEditing(false);
      toast.success("Teacher updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update teacher");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-24 text-center text-muted-foreground">Loading...</div>;
  }

  if (notFound || !teacher) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground mb-3">Teacher not found</p>
        <button onClick={() => router.push("/admin/teachers")} className="text-sm text-primary font-medium hover:underline">
          Back to Teachers
        </button>
      </div>
    );
  }

  const isActive = !teacher.leave_date;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.push("/admin/teachers")}
          className="p-2 rounded-xl hover:bg-secondary text-muted-foreground shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-lg font-semibold text-success shrink-0 overflow-hidden">
          {teacher.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={teacher.photo_url} alt={teacher.full_name} className="w-full h-full object-cover" />
          ) : (
            getInitials(teacher.full_name)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground truncate">{teacher.full_name}</h1>
            {isActive ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                <CheckCircle2 className="w-3 h-3" /> Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                <XCircle className="w-3 h-3" /> Left
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            ID: {teacher.id} &middot; {teacher.email}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={startEditing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </button>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoField label="Nickname" value={teacher.nickname} />
          <InfoField label="Shown as" value={teacherDisplayName(teacher)} />
          <InfoField label="Phone" value={teacher.phone} />
          <InfoField label="Education" value={teacher.education} />
          <InfoField label="Join Date" value={teacher.join_date ? formatDate(teacher.join_date) : null} />
          <InfoField label="Leave Date" value={teacher.leave_date ? formatDate(teacher.leave_date) : null} />
          <div className="col-span-2 md:col-span-4">
            <InfoField label="Address" value={teacher.address} />
          </div>
          <div className="col-span-2 md:col-span-4">
            <InfoField label="Bio" value={teacher.bio} />
          </div>
        </div>
      </div>

      {editing && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditing(false)}>
          <div
            className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Edit Teacher</h3>
              <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-warning bg-warning/10 rounded-xl px-3 py-2">
                This profile is shared by every batch this teacher teaches. To replace a teacher in one batch, create a new teacher and change it in that batch&apos;s routine instead of renaming this profile.
              </p>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
                <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Nickname</label>
                  <input
                    type="text"
                    value={form.nickname}
                    onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                    placeholder="e.g. তুষার"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Gender</label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value as TeacherGender })}
                    className={inputClass}
                  >
                    <option value="">Not set</option>
                    <option value="male">Male (স্যার)</option>
                    <option value="female">Female (ম্যাম)</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Shown to students as: <span className="font-medium text-foreground">{teacherDisplayName(form) || "-"}</span>
              </p>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Phone</label>
                <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Photo</label>
                <ImageUploadField
                  value={form.photo_url}
                  onChange={(url) => setForm({ ...form, photo_url: url })}
                  purpose="teacher"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Education</label>
                <input type="text" value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Address</label>
                <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Bio</label>
                <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Join Date</label>
                  <input type="date" value={form.join_date} onChange={(e) => setForm({ ...form, join_date: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Leave Date</label>
                  <input type="date" value={form.leave_date} onChange={(e) => setForm({ ...form, leave_date: e.target.value })} className={inputClass} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.full_name || !form.email}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
