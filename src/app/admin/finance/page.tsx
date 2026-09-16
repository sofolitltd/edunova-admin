"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getToken, isAuthenticated } from "@/lib/auth";
import { financeApi, type FinanceStats } from "@/lib/api";
import { TrendingUp, TrendingDown, DollarSign, Clock, Wallet, ArrowRight } from "lucide-react";

export default function FinancePage() {
  const router = useRouter();
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/admin/login");
      return;
    }
    const token = getToken();
    if (!token) return;

    financeApi.getStats(token).then((data) => {
      setStats(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [router]);

  const formatCurrency = (amount: number) => `৳${amount.toLocaleString()}`;

  const getMonthLabel = (m: string) => {
    try {
      const date = new Date(m + "-01");
      return date.toLocaleDateString("en-US", { month: "short" });
    } catch { return m; }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Finance Dashboard</h1>
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Finance Dashboard</h1>
        <div className="text-muted-foreground">Failed to load data</div>
      </div>
    );
  }

  const maxVal = Math.max(...stats.monthly_data.map(m => Math.max(m.revenue, m.expenses)), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Finance Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Revenue, expenses, and financial overview</p>
        </div>
        <Link
          href="/admin/expenses"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition-all"
        >
          Manage Expenses
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          <div className="text-2xl font-bold text-foreground">{formatCurrency(stats.total_revenue)}</div>
          <div className="text-sm text-muted-foreground">Total Revenue</div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center mb-3">
            <TrendingDown className="w-5 h-5 text-destructive" />
          </div>
          <div className="text-2xl font-bold text-foreground">{formatCurrency(stats.total_expenses)}</div>
          <div className="text-sm text-muted-foreground">Total Expenses</div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stats.net_profit >= 0 ? "bg-primary/10" : "bg-warning/10"}`}>
            <DollarSign className={`w-5 h-5 ${stats.net_profit >= 0 ? "text-primary" : "text-warning"}`} />
          </div>
          <div className="text-2xl font-bold text-foreground">{formatCurrency(stats.net_profit)}</div>
          <div className="text-sm text-muted-foreground">Net Profit</div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-warning" />
          </div>
          <div className="text-2xl font-bold text-foreground">{formatCurrency(stats.pending_payments)}</div>
          <div className="text-sm text-muted-foreground">Pending Payments</div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h2 className="font-semibold text-foreground mb-4">Revenue vs Expenses (Last 6 Months)</h2>
        <div className="flex items-end gap-3 h-48">
          {stats.monthly_data.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="flex items-end gap-1 w-full" style={{ height: "160px" }}>
                <div
                  className="flex-1 bg-success rounded-t-lg transition-all"
                  style={{ height: `${(m.revenue / maxVal) * 100}%`, minHeight: m.revenue > 0 ? "4px" : "0" }}
                  title={`Revenue: ${formatCurrency(m.revenue)}`}
                />
                <div
                  className="flex-1 bg-destructive rounded-t-lg transition-all"
                  style={{ height: `${(m.expenses / maxVal) * 100}%`, minHeight: m.expenses > 0 ? "4px" : "0" }}
                  title={`Expenses: ${formatCurrency(m.expenses)}`}
                />
              </div>
              <span className="text-xs text-muted-foreground">{getMonthLabel(m.month)}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-4 text-sm">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-success" /> Revenue</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-destructive" /> Expenses</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Enrollments */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Recent Payments</h2>
            <Link href="/admin/enrollments" className="text-sm text-primary font-medium hover:underline">View All</Link>
          </div>
          <div className="divide-y divide-border">
            {stats.recent_enrollments.length === 0 ? (
              <div className="px-6 py-8 text-center text-muted-foreground text-sm">No payments yet</div>
            ) : (
              stats.recent_enrollments.map((e) => (
                <div key={e.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">{e.full_name}</div>
                    <div className="text-xs text-muted-foreground">{e.course_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-foreground">{formatCurrency(e.amount)}</div>
                    <div className={`text-xs font-medium ${e.status === "approved" ? "text-success" : e.status === "rejected" ? "text-destructive" : "text-warning"}`}>
                      {e.status}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Recent Expenses</h2>
            <Link href="/admin/expenses" className="text-sm text-primary font-medium hover:underline">View All</Link>
          </div>
          <div className="divide-y divide-border">
            {stats.recent_expenses.length === 0 ? (
              <div className="px-6 py-8 text-center text-muted-foreground text-sm">No expenses yet</div>
            ) : (
              stats.recent_expenses.map((e) => (
                <div key={e.id} className="flex items-center justify-between px-6 py-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">{e.description}</div>
                    <div className="text-xs text-muted-foreground capitalize">{e.category} · {e.date}</div>
                  </div>
                  <div className="text-sm font-bold text-destructive">-{formatCurrency(e.amount)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
