"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, type User, type PaginatedUsers } from "@/lib/api";
import { getToken } from "@/lib/auth";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Trash2,
  Shield,
  ShieldOff,
} from "lucide-react";
import { toast } from "sonner";

export default function UsersPage() {
  const router = useRouter();
  const [data, setData] = useState<PaginatedUsers | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchUsers = useCallback(
    async (p: number, s: string) => {
      const token = getToken();
      if (!token) {
        router.push("/admin/login");
        return;
      }
      setLoading(true);
      try {
        const result = await api.getUsers(token, p, s);
        setData(result);
      } catch {
        toast.error("Failed to load users");
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    fetchUsers(page, search);
  }, [page, fetchUsers, search]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleToggleVerify = async (id: number) => {
    const token = getToken();
    if (!token) return;
    try {
      const result = await api.toggleVerify(token, id);
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          users: prev.users.map((u) =>
            u.id === id ? { ...u, verified: result.verified } : u
          ),
        };
      });
      toast.success(result.verified ? "User verified" : "User unverified");
    } catch {
      toast.error("Failed to update user");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    const token = getToken();
    if (!token) return;
    setDeletingId(id);
    try {
      await api.deleteUser(token, id);
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          users: prev.users.filter((u) => u.id !== id),
          total: prev.total - 1,
        };
      });
      toast.success("User deleted");
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <p className="text-muted-foreground mt-1">Manage registered users</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name or mobile..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border shadow-sm-custom overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  User
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Mobile
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Class
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Guardian
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Joined
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : data?.users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    No users found
                  </td>
                </tr>
              ) : (
                data?.users.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => router.push(`/admin/users/${user.id}`)}
                    className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                          {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                            {user.full_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ID: {user.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {user.mobile}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {user.student_class ? `Class ${user.student_class}` : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {user.father_name || user.father_mobile ? (
                        <div>
                          <p className="text-foreground">{user.father_name || "—"}</p>
                          {user.father_mobile && <p className="text-xs text-muted-foreground">{user.father_mobile}</p>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.verified ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning">
                          <XCircle className="w-3.5 h-3.5" />
                          Unverified
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleVerify(user.id); }}
                          className={`p-2 rounded-lg transition-colors ${
                            user.verified
                              ? "text-warning hover:bg-warning/10"
                              : "text-success hover:bg-success/10"
                          }`}
                          title={user.verified ? "Unverify" : "Verify"}
                        >
                          {user.verified ? (
                            <ShieldOff className="w-4 h-4" />
                          ) : (
                            <Shield className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(user.id, user.full_name); }}
                          disabled={deletingId === user.id}
                          className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Showing {(data.page - 1) * data.per_page + 1}–
              {Math.min(data.page * data.per_page, data.total)} of {data.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-foreground px-3">
                {data.page} / {data.total_pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                disabled={page === data.total_pages}
                className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
