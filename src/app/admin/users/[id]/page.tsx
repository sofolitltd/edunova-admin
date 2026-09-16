"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getToken, isAuthenticated } from "@/lib/auth";
import {
  api,
  paymentApi,
  attendanceApi,
  doubtApi,
  resultApi,
  notificationApi,
  transitionApi,
  type User,
  type Enrollment,
  type Payment,
  type AttendanceRecord,
  type Doubt,
  type Result,
  type StudentTransition,
} from "@/lib/api";
import {
  ArrowLeft,
  Phone,
  MapPin,
  School,
  Users as UsersIcon,
  Shield,
  ShieldOff,
  Trash2,
  CheckCircle2,
  XCircle,
  ClipboardList,
  CreditCard,
  UserCheck,
  Award,
  HelpCircle,
  Smartphone,
  GraduationCap,
  Bell,
  Info,
  Download,
  AlertCircle,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

type Tab = "overview" | "enrollments" | "payments" | "attendance" | "results" | "doubts" | "devices" | "transitions";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Overview", icon: <Info className="w-3.5 h-3.5" /> },
  { key: "enrollments", label: "Enrollments", icon: <ClipboardList className="w-3.5 h-3.5" /> },
  { key: "payments", label: "Payments", icon: <CreditCard className="w-3.5 h-3.5" /> },
  { key: "attendance", label: "Attendance", icon: <UserCheck className="w-3.5 h-3.5" /> },
  { key: "results", label: "Results", icon: <Award className="w-3.5 h-3.5" /> },
  { key: "doubts", label: "Doubts", icon: <HelpCircle className="w-3.5 h-3.5" /> },
  { key: "transitions", label: "Transitions", icon: <GraduationCap className="w-3.5 h-3.5" /> },
  { key: "devices", label: "Devices", icon: <Smartphone className="w-3.5 h-3.5" /> },
];

const enrollmentStatusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/30",
  approved: "bg-success/10 text-success border-success/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
};

const paymentStatusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/30",
  verified: "bg-success/10 text-success border-success/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
};

const attendanceStatusColors: Record<string, string> = {
  present: "bg-success/10 text-success border-success/30",
  absent: "bg-destructive/10 text-destructive border-destructive/30",
  late: "bg-warning/10 text-warning border-warning/30",
};

const doubtStatusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/30",
  resolved: "bg-success/10 text-success border-success/30",
  closed: "bg-secondary text-muted-foreground border-border",
};

function Empty({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="py-12 text-center">
      <Icon className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || "-"}</p>
    </div>
  );
}

export default function StudentDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const userId = Number(params.id);
  const batchId = searchParams.get("batchId");
  const backHref = batchId ? `/admin/batches/${batchId}` : "/admin/users";

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [devices, setDevices] = useState<Array<{ id: number; user_id: number; user_name: string; platform: string; created_at: string }>>([]);
  const [transitions, setTransitions] = useState<StudentTransition[]>([]);
  const [tabLoading, setTabLoading] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);

  const downloadReceipt = (p: Payment) => {
    setReceiptPayment(p);
    setTimeout(() => window.print(), 50);
  };

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/admin/login"); return; }
    const token = getToken();
    if (!token || !userId) return;

    const load = async () => {
      setLoading(true);
      try {
        const found = await api.getUserById(token, userId);
        setUser(found);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [userId, router]);

  const loadTab = useCallback(async (tab: Tab) => {
    const token = getToken();
    if (!token || !userId) return;
    setTabLoading(true);
    try {
      if (tab === "enrollments") {
        const data = await api.getEnrollments(token, 1, "all", "", userId);
        setEnrollments(data.enrollments);
      } else if (tab === "payments") {
        setPayments(await paymentApi.getPayments(token, undefined, userId));
      } else if (tab === "attendance") {
        setAttendance(await attendanceApi.getStudentAttendance(token, userId));
      } else if (tab === "results") {
        setResults(await resultApi.getResults(token, userId));
      } else if (tab === "doubts") {
        setDoubts(await doubtApi.getDoubts(token, undefined, userId));
      } else if (tab === "devices") {
        const data = await notificationApi.getDevices(token, userId);
        setDevices(data.devices);
      } else if (tab === "transitions") {
        const all = await transitionApi.getTransitions(token).catch(() => []);
        setTransitions(all.filter((t) => t.user_id === userId));
      }
    } catch {
      toast.error("Failed to load data");
    } finally {
      setTabLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!loading && user) void loadTab(activeTab);
  }, [activeTab, loading, user, loadTab]);

  const handleToggleVerify = async () => {
    const token = getToken();
    if (!token || !user) return;
    try {
      const result = await api.toggleVerify(token, user.id);
      setUser({ ...user, verified: result.verified });
      toast.success(result.verified ? "Student verified" : "Student unverified");
    } catch {
      toast.error("Failed to update student");
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    const token = getToken();
    if (!token) return;
    setDeleting(true);
    try {
      await api.deleteUser(token, user.id);
      toast.success("Student deleted");
      router.push(backHref);
    } catch {
      toast.error("Failed to delete student");
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="py-24 text-center text-muted-foreground">Loading...</div>;
  }

  if (notFound || !user) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground mb-3">Student not found</p>
        <button onClick={() => router.push(backHref)} className="text-sm text-primary font-medium hover:underline">{batchId ? "Back to Batch" : "Back to Users"}</button>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6 print:hidden">
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.push(backHref)}
          className="p-2 rounded-xl hover:bg-secondary text-muted-foreground shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-semibold text-primary shrink-0">
          {user.full_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground truncate">{user.full_name}</h1>
            {user.verified ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                <CheckCircle2 className="w-3 h-3" /> Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
                <XCircle className="w-3 h-3" /> Unverified
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            ID: {user.id} &middot; {user.mobile}
            {user.student_class && <> &middot; Class {user.student_class}</>}
          </p>
        </div>
        {!batchId && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleToggleVerify}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                user.verified ? "text-warning hover:bg-warning/10" : "text-success hover:bg-success/10"
              }`}
            >
              {user.verified ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
              {user.verified ? "Unverify" : "Verify"}
            </button>
            <button
              onClick={() => setShowDelete(true)}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto sm:flex-wrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all shrink-0 whitespace-nowrap ${
              activeTab === t.key ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <div className="border-b border-border" />

      {/* Overview */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" /> Contact & Identity
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InfoField label="Mobile" value={user.mobile} />
                <InfoField label="Notification Mobile" value={user.notification_mobile} />
                <InfoField label="Gender" value={user.gender} />
                <InfoField label="Religion" value={user.religion} />
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <School className="w-4 h-4 text-muted-foreground" /> Academic
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InfoField label="Class" value={user.student_class ? `Class ${user.student_class}` : ""} />
                <InfoField label="Shift" value={user.shift} />
                <InfoField label="School" value={user.school} />
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" /> Address
              </h3>
              <p className="text-sm font-medium text-foreground">{user.address || "-"}</p>
            </div>

            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <UsersIcon className="w-4 h-4 text-muted-foreground" /> Guardian
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InfoField label="Father's Name" value={user.father_name} />
                <InfoField label="Father's Mobile" value={user.father_mobile} />
                <InfoField label="Mother's Name" value={user.mother_name} />
                <InfoField label="Mother's Mobile" value={user.mother_mobile} />
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <div className="grid grid-cols-2 gap-4">
                <InfoField label="Joined" value={new Date(user.created_at).toLocaleString()} />
                <InfoField label="Last Updated" value={new Date(user.updated_at).toLocaleString()} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transitions */}
      {activeTab === "transitions" && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Class Transition History ({transitions.length})</h3>
          </div>
          {tabLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading...</div>
          ) : transitions.length === 0 ? (
            <Empty icon={GraduationCap} text="No class transitions recorded" />
          ) : (
            <div className="divide-y divide-border">
              {transitions.map((t) => (
                <div key={t.id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Class {t.from_class} &rarr; Class {t.to_class}</p>
                    <p className="text-xs text-muted-foreground">GPA {t.gpa} &middot; {new Date(t.submitted_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Enrollments */}
      {activeTab === "enrollments" && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Enrollments ({enrollments.length})</h3>
          </div>
          {tabLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading...</div>
          ) : enrollments.length === 0 ? (
            <Empty icon={ClipboardList} text="No enrollments found" />
          ) : (
            <div className="divide-y divide-border">
              {enrollments.map((en) => (
                <div key={en.id} className="flex items-center justify-between px-6 py-4 flex-wrap gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{en.course_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {en.batch_name || "No batch"} &middot; {en.payment_method || "-"} &middot; ৳{en.amount} &middot; {new Date(en.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${enrollmentStatusColors[en.status] || ""}`}>
                    {en.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Payments */}
      {activeTab === "payments" && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Payments ({payments.length})</h3>
          </div>
          {tabLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading...</div>
          ) : payments.length === 0 ? (
            <Empty icon={CreditCard} text="No payments found" />
          ) : (
            <div className="divide-y divide-border">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-6 py-4 flex-wrap gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">৳{p.amount.toLocaleString()} &middot; {p.course_name || "General"}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.method}{p.month ? ` · ${p.month} ${p.year}` : ""} &middot; {new Date(p.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${paymentStatusColors[p.status] || ""}`}>
                      {p.status}
                    </span>
                    <button
                      onClick={() => downloadReceipt(p)}
                      title="Download billing receipt"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Attendance */}
      {activeTab === "attendance" && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Attendance History ({attendance.length})</h3>
          </div>
          {tabLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading...</div>
          ) : attendance.length === 0 ? (
            <Empty icon={UserCheck} text="No attendance records found" />
          ) : (
            <div className="divide-y divide-border">
              {attendance.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-6 py-3 flex-wrap gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{new Date(a.date).toLocaleDateString()}</p>
                    {a.notes && <p className="text-xs text-muted-foreground">{a.notes}</p>}
                  </div>
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${attendanceStatusColors[a.status] || ""}`}>
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {activeTab === "results" && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Exam Results ({results.length})</h3>
          </div>
          {tabLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading...</div>
          ) : results.length === 0 ? (
            <Empty icon={Award} text="No results found" />
          ) : (
            <div className="divide-y divide-border">
              {results.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-6 py-3 flex-wrap gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{r.exam_name} &middot; {r.subject}</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.exam_date).toLocaleDateString()}{r.remarks ? ` · ${r.remarks}` : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{r.marks_obtained}/{r.marks_total}</p>
                    <p className="text-xs text-muted-foreground">{r.percentage.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Doubts */}
      {activeTab === "doubts" && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Doubts ({doubts.length})</h3>
          </div>
          {tabLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading...</div>
          ) : doubts.length === 0 ? (
            <Empty icon={HelpCircle} text="No doubts submitted" />
          ) : (
            <div className="divide-y divide-border">
              {doubts.map((d) => (
                <div key={d.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground max-w-xl">{d.question_text}</p>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border capitalize shrink-0 ${doubtStatusColors[d.status] || ""}`}>
                      {d.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {d.subject || "General"}{d.chapter ? ` · ${d.chapter}` : ""} &middot; {new Date(d.created_at).toLocaleDateString()}
                  </p>
                  {d.resolution && (
                    <p className="text-xs text-muted-foreground mt-2 bg-secondary/50 rounded-lg p-2">{d.resolution}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Devices */}
      {activeTab === "devices" && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Registered Devices ({devices.length})</h3>
          </div>
          {tabLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading...</div>
          ) : devices.length === 0 ? (
            <Empty icon={Smartphone} text="No devices registered for push notifications" />
          ) : (
            <div className="divide-y divide-border">
              {devices.map((d) => (
                <div key={d.id} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground capitalize">{d.platform}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>

    {/* Printable receipt */}
    {receiptPayment && (
      <div className="hidden print:block bg-card rounded-2xl border border-border p-8 space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-lg font-bold text-foreground">EduNova — Payment Receipt</h2>
          <p className="text-xs text-muted-foreground">{new Date(receiptPayment.created_at).toLocaleString("en-BD")}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Student</p>
            <p className="font-medium text-foreground">{receiptPayment.user_name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Phone</p>
            <p className="font-medium text-foreground">{receiptPayment.user_mobile}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Course</p>
            <p className="font-medium text-foreground">{receiptPayment.course_name || "General"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Receipt No.</p>
            <p className="font-medium text-foreground">{receiptPayment.receipt_number || `EN-${receiptPayment.id}`}</p>
          </div>
        </div>

        <div className="space-y-1 text-sm border-t border-border pt-3">
          <div className="flex items-center justify-between font-semibold text-foreground">
            <span>Amount Paid</span>
            <span>৳{receiptPayment.amount.toLocaleString()}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm border-t border-border pt-3">
          <div>
            <p className="text-xs text-muted-foreground">Payment Type</p>
            <p className="font-medium text-foreground capitalize">{receiptPayment.method}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="font-medium text-foreground capitalize">{receiptPayment.status}</p>
          </div>
          {receiptPayment.month && (
            <div>
              <p className="text-xs text-muted-foreground">Billing Period</p>
              <p className="font-medium text-foreground">{receiptPayment.month} {receiptPayment.year}</p>
            </div>
          )}
          {receiptPayment.transaction_id && (
            <div>
              <p className="text-xs text-muted-foreground">Transaction ID</p>
              <p className="font-medium text-foreground">{receiptPayment.transaction_id}</p>
            </div>
          )}
        </div>
      </div>
    )}

    {showDelete && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 print:hidden" onClick={() => setShowDelete(false)}>
        <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Delete Student</h3>
            <button onClick={() => setShowDelete(false)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Are you sure?</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This will permanently delete <strong>{user.full_name}</strong> ({user.mobile}) and all of their data. This action cannot be undone.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
            <button onClick={() => setShowDelete(false)} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors">
              Cancel
            </button>
            <button
              onClick={() => { setShowDelete(false); handleDelete(); }}
              disabled={deleting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive text-white text-sm font-medium hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
