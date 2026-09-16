"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { api, type AdminUser } from "@/lib/api";
import { User, Mail, Lock, Save, Eye, EyeOff, Shield, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function AdminProfilePage() {
  const router = useRouter();
  const token = getToken() || "";

  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Profile form
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  // Password form
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    api.getAdminProfile(token).then((data) => {
      setAdmin(data);
      setFullName(data.full_name);
      setEmail(data.email);
      setLoading(false);
    }).catch(() => {
      toast.error("Failed to load profile");
      setLoading(false);
    });
  }, [token]);

  const handleUpdateProfile = async () => {
    if (!fullName.trim() || !email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSaving(true);
    try {
      const updated = await api.updateAdminProfile(token, { full_name: fullName, email });
      setAdmin(updated);
      // Update localStorage
      localStorage.setItem("edunova_admin", JSON.stringify(updated));
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword) {
      toast.error("Current password is required");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setChangingPassword(true);
    try {
      await api.changeAdminPassword(token, oldPassword, newPassword);
      toast.success("Password changed successfully");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Profile not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account information and security</p>
      </div>

      {/* Profile Card */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {/* Banner */}
        <div className="h-32 bg-gradient-to-br from-primary to-primary-dark relative">
          <div className="absolute -bottom-12 left-6">
            <div className="w-24 h-24 rounded-2xl bg-card border-4 border-card flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold text-primary">{getInitials(admin.full_name)}</span>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="pt-16 px-6 pb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">{admin.full_name}</h2>
              <p className="text-sm text-muted-foreground">{admin.email}</p>
              <div className="flex items-center gap-4 mt-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  <Shield className="w-3 h-3" />
                  Admin
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  Joined {formatDate(admin.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Edit Profile */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Personal Information</h3>
              <p className="text-xs text-muted-foreground">Update your name and email</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <button
              onClick={handleUpdateProfile}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Change Password</h3>
              <p className="text-xs text-muted-foreground">Keep your account secure</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Current Password</label>
              <div className="relative">
                <input
                  type={showOldPassword ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2.5 pr-10 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  className="w-full px-3 py-2.5 pr-10 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive mt-1">Passwords do not match</p>
              )}
            </div>
            <button
              onClick={handleChangePassword}
              disabled={changingPassword || !oldPassword || !newPassword || !confirmPassword}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-warning text-white text-sm font-medium hover:bg-warning/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Lock className="w-4 h-4" />
              {changingPassword ? "Changing..." : "Change Password"}
            </button>
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">Account Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary">
            <Mail className="w-5 h-5 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Email</div>
              <div className="text-sm font-medium text-foreground">{admin.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary">
            <Shield className="w-5 h-5 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Role</div>
              <div className="text-sm font-medium text-foreground">Admin</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Last Updated</div>
              <div className="text-sm font-medium text-foreground">{formatDate(admin.updated_at)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
