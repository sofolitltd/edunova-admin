"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, getStoredAdmin, isAuthenticated } from "@/lib/auth";
import { api, type AdminUser } from "@/lib/api";
import { Shield, Plus, Trash2, RefreshCw, ChevronDown, X, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function AdminsPage() {
  const router = useRouter();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showReset, setShowReset] = useState<AdminUser | null>(null);
  const [showDelete, setShowDelete] = useState<AdminUser | null>(null);
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ email: "", password: "", full_name: "", role: "admin" });
  const [resetPassword, setResetPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/admin/login");
      return;
    }
    const admin = getStoredAdmin();
    if (admin?.role !== "master_admin") {
      router.push("/admin/dashboard");
      return;
    }
    setIsMasterAdmin(true);
    loadAdmins();
  }, [router]);

  const loadAdmins = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await api.listAdmins(token);
      setAdmins(data);
    } catch {
      toast.error("Failed to load admins");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      await api.createAdmin(token, newAdmin);
      toast.success("Admin created");
      setShowCreate(false);
      setNewAdmin({ email: "", password: "", full_name: "", role: "admin" });
      loadAdmins();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create admin");
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (admin: AdminUser, newRole: string) => {
    const token = getToken();
    if (!token) return;
    try {
      await api.updateAdminRole(token, admin.id, newRole);
      toast.success("Role updated");
      loadAdmins();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role");
    }
  };

  const handleResetPassword = async () => {
    if (!showReset || !resetPassword) return;
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      await api.resetAdminPassword(token, showReset.id, resetPassword);
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
      await api.deleteAdmin(token, showDelete.id);
      toast.success("Admin deleted");
      setShowDelete(null);
      loadAdmins();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete admin");
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "master_admin": return "bg-primary/10 text-primary";
      case "admin": return "bg-warning/10 text-warning";
      case "moderator": return "bg-success/10 text-success";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
    catch { return d; }
  };

  if (!isMasterAdmin) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Management</h1>
          <p className="text-sm text-muted-foreground">Manage admin users and their roles</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Admin
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="text-2xl font-bold text-foreground">{admins.length}</div>
          <div className="text-sm text-muted-foreground">Total Admins</div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="text-2xl font-bold text-primary">{admins.filter(a => a.role === "master_admin").length}</div>
          <div className="text-sm text-muted-foreground">Master Admins</div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="text-2xl font-bold text-success">{admins.filter(a => a.role === "admin").length}</div>
          <div className="text-sm text-muted-foreground">Admins</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">All Admins</h2>
        </div>
        {loading ? (
          <div className="px-6 py-12 text-center text-muted-foreground">Loading...</div>
        ) : admins.length === 0 ? (
          <div className="px-6 py-12 text-center text-muted-foreground">No admins found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Admin</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Role</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Joined</th>
                  <th className="text-right px-6 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {getInitials(admin.full_name)}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{admin.full_name}</div>
                          <div className="text-xs text-muted-foreground">{admin.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={admin.role}
                        onChange={(e) => handleRoleChange(admin, e.target.value)}
                        disabled={admin.role === "master_admin"}
                        className={`inline-flex items-center pl-2.5 pr-6 py-1 rounded-full text-xs font-medium border-0 bg-transparent appearance-none bg-no-repeat bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%2210%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b7280%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22></polyline></svg>)] bg-[position:right_0.5rem_center] ${getRoleBadge(admin.role)} ${admin.role !== "master_admin" ? "cursor-pointer hover:opacity-80" : "cursor-not-allowed"}`}
                      >
                        <option value="master_admin">Master Admin</option>
                        <option value="admin">Admin</option>
                        <option value="moderator">Moderator</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{formatDate(admin.created_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {admin.role !== "master_admin" && (
                          <>
                            <button
                              onClick={() => setShowReset(admin)}
                              className="p-2 rounded-lg hover:bg-warning/10 text-muted-foreground hover:text-warning transition-colors"
                              title="Reset password"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setShowDelete(admin)}
                              className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              title="Delete admin"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {admin.role === "master_admin" && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            <Shield className="w-3 h-3" />
                            You
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Admin Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreate(false)}>
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Create Admin</h3>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={newAdmin.full_name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, full_name: e.target.value })}
                  placeholder="Enter full name"
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                <input
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  placeholder="admin@example.com"
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                <input
                  type="password"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Role</label>
                <select
                  value={newAdmin.role}
                  onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
                  className="w-full px-3 py-2.5 pr-10 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none bg-no-repeat bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b7280%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22></polyline></svg>)] bg-[position:right_0.75rem_center]"
                >
                  <option value="admin">Admin</option>
                  <option value="moderator">Moderator</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !newAdmin.email || !newAdmin.password || !newAdmin.full_name}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Admin
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
              <h3 className="font-semibold text-foreground">Delete Admin</h3>
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
