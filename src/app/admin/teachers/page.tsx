"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, getStoredAdmin, isAuthenticated } from "@/lib/auth";
import { api, type Teacher } from "@/lib/api";
import { Plus, Trash2, RefreshCw, X, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function TeachersPage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showReset, setShowReset] = useState<Teacher | null>(null);
  const [showDelete, setShowDelete] = useState<Teacher | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [newTeacher, setNewTeacher] = useState({ email: "", password: "", full_name: "" });
  const [resetPassword, setResetPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/admin/login");
      return;
    }
    const admin = getStoredAdmin();
    if (admin?.role !== "master_admin" && admin?.role !== "admin") {
      router.push("/admin/dashboard");
      return;
    }
    setCanManage(true);
    loadTeachers();
  }, [router]);

  const loadTeachers = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await api.listTeachers(token);
      setTeachers(data);
    } catch {
      toast.error("Failed to load teachers");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      await api.createTeacher(token, newTeacher);
      toast.success("Teacher created");
      setShowCreate(false);
      setNewTeacher({ email: "", password: "", full_name: "" });
      loadTeachers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create teacher");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!showReset || !resetPassword) return;
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      await api.resetTeacherPassword(token, showReset.id, resetPassword);
      toast.success("Password reset");
      setShowReset(null);
      setResetPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password");
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
      await api.deleteTeacher(token, showDelete.id);
      toast.success("Teacher deleted");
      setShowDelete(null);
      loadTeachers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete teacher");
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
    catch { return d; }
  };

  if (!canManage) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Teacher Management</h1>
          <p className="text-sm text-muted-foreground">Manage teacher accounts and their portal access</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Teacher
        </button>
      </div>

      {/* Stats */}
      <div className="bg-card rounded-2xl border border-border p-4 w-fit">
        <div className="text-2xl font-bold text-foreground">{teachers.length}</div>
        <div className="text-sm text-muted-foreground">Total Teachers</div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">All Teachers</h2>
        </div>
        {loading ? (
          <div className="px-6 py-12 text-center text-muted-foreground">Loading...</div>
        ) : teachers.length === 0 ? (
          <div className="px-6 py-12 text-center text-muted-foreground">No teachers found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Teacher</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Joined</th>
                  <th className="text-right px-6 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {teachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center text-sm font-bold text-success">
                          {getInitials(teacher.full_name)}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{teacher.full_name}</div>
                          <div className="text-xs text-muted-foreground">{teacher.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{formatDate(teacher.created_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setShowReset(teacher)}
                          className="p-2 rounded-lg hover:bg-warning/10 text-muted-foreground hover:text-warning transition-colors"
                          title="Reset password"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowDelete(teacher)}
                          className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete teacher"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Teacher Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreate(false)}>
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Create Teacher</h3>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={newTeacher.full_name}
                  onChange={(e) => setNewTeacher({ ...newTeacher, full_name: e.target.value })}
                  placeholder="Enter full name"
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                <input
                  type="email"
                  value={newTeacher.email}
                  onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                  placeholder="teacher@example.com"
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                <input
                  type="password"
                  value={newTeacher.password}
                  onChange={(e) => setNewTeacher({ ...newTeacher, password: e.target.value })}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                The teacher can sign in at <span className="font-mono">/teacher</span> using this email and password.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !newTeacher.email || !newTeacher.password || !newTeacher.full_name}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Teacher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowReset(null)}>
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Reset Password</h3>
              <button onClick={() => setShowReset(null)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted-foreground mb-4">
                Set a new password for <strong className="text-foreground">{showReset.full_name}</strong>
              </p>
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="New password (min 6 characters)"
                className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowReset(null)} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors">
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={saving || resetPassword.length < 6}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-warning text-white text-sm font-medium hover:bg-warning/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDelete(null)}>
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Delete Teacher</h3>
              <button onClick={() => setShowDelete(null)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Are you sure?</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This will permanently delete <strong>{showDelete.full_name}</strong> ({showDelete.email}). This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowDelete(null)} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors">
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive text-white text-sm font-medium hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
