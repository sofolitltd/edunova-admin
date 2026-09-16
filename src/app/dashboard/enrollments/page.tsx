"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUserToken, isUserAuthenticated } from "@/lib/auth";
import { api, type Enrollment } from "@/lib/api";
import {
  BookOpen,
  Clock,
  CheckCircle,
  XCircle,
  GraduationCap,
  Loader2,
  CreditCard,
  Calendar,
  ArrowLeft,
} from "lucide-react";

export default function EnrollmentsPage() {
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "approved" | "pending" | "rejected">("all");

  useEffect(() => {
    if (!isUserAuthenticated()) {
      router.push("/login");
      return;
    }
    const token = getUserToken();
    if (!token) return;

    api
      .getUserEnrollments(token)
      .then((data) => {
        setEnrollments(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const filtered =
    filter === "all"
      ? enrollments
      : enrollments.filter((e) => e.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-success/10 text-success border-success/20";
      case "rejected":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-warning/10 text-warning border-warning/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-4 h-4 text-success" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-warning" />;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-BD", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatPayment = (method: string) => {
    const map: Record<string, string> = {
      bkash: "bKash",
      nagad: "Nagad",
      rocket: "Rocket",
      cash: "Cash",
      card: "Card",
    };
    return map[method] || method || "N/A";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading enrollments...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Enrollments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track all your course enrollments
          </p>
        </div>
        <Link
          href="/courses"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark transition-all"
        >
          <GraduationCap className="w-4 h-4" />
          Browse Courses
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Total",
            value: enrollments.length,
            icon: BookOpen,
            color: "primary",
          },
          {
            label: "Approved",
            value: enrollments.filter((e) => e.status === "approved").length,
            icon: CheckCircle,
            color: "success",
          },
          {
            label: "Pending",
            value: enrollments.filter((e) => e.status === "pending").length,
            icon: Clock,
            color: "warning",
          },
          {
            label: "Rejected",
            value: enrollments.filter((e) => e.status === "rejected").length,
            icon: XCircle,
            color: "destructive",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-card rounded-2xl border border-border p-4"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl bg-${stat.color}/10 flex items-center justify-center`}
              >
                <stat.icon className={`w-4 h-4 text-${stat.color}`} />
              </div>
              <div>
                <div className="text-lg font-bold text-foreground">
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {(["all", "approved", "pending", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Enrollments List */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <GraduationCap className="w-14 h-14 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground font-medium">
              No enrollments found
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {filter === "all"
                ? "You haven't enrolled in any courses yet."
                : `No ${filter} enrollments.`}
            </p>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark transition-all"
            >
              Browse Courses
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((e) => (
              <div
                key={e.id}
                className="px-6 py-5 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-foreground truncate">
                          {e.course_name || "Course"}
                        </h3>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                            e.status
                          )}`}
                        >
                          {getStatusIcon(e.status)}
                          {e.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Enrolled {formatDate(e.created_at)}
                        </span>
                        {e.payment_method && (
                          <span className="inline-flex items-center gap-1">
                            <CreditCard className="w-3.5 h-3.5" />
                            {formatPayment(e.payment_method)}
                            {e.amount > 0 && ` · ৳${e.amount.toLocaleString()}`}
                          </span>
                        )}
                        {e.batch_name && (
                          <span className="inline-flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5" />
                            {e.batch_name}
                          </span>
                        )}
                      </div>

                      {e.status === "pending" && (
                        <p className="text-xs text-warning mt-2">
                          Your enrollment is being reviewed. You&apos;ll be notified
                          once approved.
                        </p>
                      )}
                      {e.status === "rejected" && (
                        <p className="text-xs text-destructive mt-2">
                          Enrollment was not approved. Please contact support.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
