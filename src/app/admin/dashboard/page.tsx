"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type DashboardStats } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { Users, UserCheck, BookOpen, FileText } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const statCards = [
  { key: "total_users" as const, label: "Total Users", icon: Users, color: "from-primary to-primary-dark" },
  { key: "verified_users" as const, label: "Verified Users", icon: UserCheck, color: "from-success to-emerald-600" },
  { key: "total_courses" as const, label: "Total Courses", icon: BookOpen, color: "from-accent to-pink-500" },
  { key: "total_exams" as const, label: "Total Exams", icon: FileText, color: "from-warning to-amber-600" },
];

const mockChartData = [
  { name: "Mon", users: 4 },
  { name: "Tue", users: 7 },
  { name: "Wed", users: 3 },
  { name: "Thu", users: 9 },
  { name: "Fri", users: 5 },
  { name: "Sat", users: 12 },
  { name: "Sun", users: 6 },
];

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/admin/login");
      return;
    }
    api
      .getDashboard(token)
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.key}
            className="bg-card rounded-2xl border border-border p-6 shadow-sm-custom hover:shadow-md-custom transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {stats?.[card.key] ?? 0}
                </p>
              </div>
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}
              >
                <card.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm-custom">
        <h2 className="text-lg font-semibold text-foreground mb-6">
          Weekly Registrations
        </h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mockChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="name"
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                axisLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                axisLine={{ stroke: "var(--border)" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  color: "var(--foreground)",
                }}
              />
              <Bar
                dataKey="users"
                fill="var(--primary)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
