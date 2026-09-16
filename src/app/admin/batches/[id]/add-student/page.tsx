"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getToken, isAuthenticated } from "@/lib/auth";
import { batchApi, userSearchApi, academicManagementApi, type Batch, type SearchUser, type ClassItem, type Enrollment } from "@/lib/api";
import { ArrowLeft, Search, Loader2, CheckCircle2, Printer, AlertTriangle, Users } from "lucide-react";
import { toast } from "sonner";

type DiscountType = "percentage" | "fixed";
type FeeLine = { amount: number; discount_type: DiscountType; discount_value: number };
type PaymentMethod = "cash" | "online";

const emptyFeeLine: FeeLine = { amount: 0, discount_type: "percentage", discount_value: 0 };

const emptyNewStudent = {
  student_id: "", full_name: "", mobile: "", gender: "", student_class: "", school: "", school_shift: "",
  father_name: "", father_mobile: "", mother_name: "", mother_mobile: "", notification_mobile: "", address: "",
  admission: emptyFeeLine, note: emptyFeeLine, monthly: emptyFeeLine,
  payment_method: "cash" as PaymentMethod, payment_reference: "",
};

function feeTotal(fee: FeeLine): number {
  const discount = fee.discount_type === "percentage" ? Math.round((fee.amount * fee.discount_value) / 100) : fee.discount_value;
  return Math.max(0, fee.amount - discount);
}

function feeDiscount(fee: FeeLine): number {
  return fee.discount_type === "percentage" ? Math.round((fee.amount * fee.discount_value) / 100) : fee.discount_value;
}

export default function AddStudentPage() {
  const router = useRouter();
  const params = useParams();
  const batchCode = String(params.id);

  const [loading, setLoading] = useState(true);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [overrideCapacity, setOverrideCapacity] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [newStudent, setNewStudent] = useState(emptyNewStudent);
  const [saving, setSaving] = useState(false);

  const [phoneMatch, setPhoneMatch] = useState<SearchUser | null>(null);
  const [phoneChecking, setPhoneChecking] = useState(false);
  const [phoneChecked, setPhoneChecked] = useState(false);

  const [studentIdChecking, setStudentIdChecking] = useState(false);
  const [studentIdAvailable, setStudentIdAvailable] = useState<boolean | null>(null);

  const [success, setSuccess] = useState<{ enrollment: Enrollment; breakdown: typeof newStudent } | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.push("/admin/login"); return; }
    const token = getToken();
    if (!token || !batchCode) return;

    const load = async () => {
      setLoading(true);
      try {
        const batches = await batchApi.getBatches(token);
        const found = batches.find((b) => b.code && b.code === batchCode) ?? batches.find((b) => String(b.id) === batchCode) ?? null;
        setBatch(found);
        if (!found) {
          toast.error("Batch not found");
        } else {
          setNewStudent((prev) => ({
            ...prev,
            admission: { ...prev.admission, amount: found.admission_fee || 0 },
            note: { ...prev.note, amount: found.note_fee || 0 },
            monthly: { ...prev.monthly, amount: found.monthly_fee || 0 },
          }));
          batchApi.getBatchStudents(token, found.id).then((students) => setStudentCount(students.length)).catch(() => {});
          batchApi.getNextStudentId(token, found.id)
            .then(({ student_id }) => setNewStudent((prev) => ({ ...prev, student_id })))
            .catch(() => {});
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
    academicManagementApi.getClasses(token).then(setClasses).catch(() => {});
  }, [batchCode, router]);

  useEffect(() => {
    const q = searchQuery.trim();
    const flagTimer = setTimeout(() => { if (q.length >= 2) setSearching(true); }, 0);
    const searchTimer = setTimeout(async () => {
      if (q.length < 2) { setSearchResults([]); setSearching(false); return; }
      const token = getToken();
      if (!token) return;
      try {
        const results = await userSearchApi.searchUsers(token, q);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 600);
    return () => { clearTimeout(flagTimer); clearTimeout(searchTimer); };
  }, [searchQuery]);

  useEffect(() => {
    if (selectedUser) {
      const clearTimer = setTimeout(() => { setPhoneMatch(null); setPhoneChecked(false); }, 0);
      return () => clearTimeout(clearTimer);
    }
    const mobile = newStudent.mobile.trim();
    const flagTimer = setTimeout(() => { if (mobile.length >= 6) setPhoneChecking(true); }, 0);
    const checkTimer = setTimeout(async () => {
      if (mobile.length < 6) { setPhoneMatch(null); setPhoneChecked(false); setPhoneChecking(false); return; }
      const token = getToken();
      if (!token) return;
      try {
        const results = await userSearchApi.searchUsers(token, mobile);
        setPhoneMatch(results.find((u) => u.mobile === mobile) ?? null);
      } catch {
        setPhoneMatch(null);
      } finally {
        setPhoneChecked(true);
        setPhoneChecking(false);
      }
    }, 600);
    return () => { clearTimeout(flagTimer); clearTimeout(checkTimer); };
  }, [newStudent.mobile, selectedUser]);

  useEffect(() => {
    const studentId = newStudent.student_id.trim();
    const flagTimer = setTimeout(() => { if (studentId) setStudentIdChecking(true); }, 0);
    const checkTimer = setTimeout(async () => {
      if (!studentId) { setStudentIdAvailable(null); setStudentIdChecking(false); return; }
      const token = getToken();
      if (!token) return;
      try {
        const { available } = await batchApi.checkStudentId(token, studentId);
        setStudentIdAvailable(available);
      } catch {
        setStudentIdAvailable(null);
      } finally {
        setStudentIdChecking(false);
      }
    }, 500);
    return () => { clearTimeout(flagTimer); clearTimeout(checkTimer); };
  }, [newStudent.student_id]);

  const selectUser = (u: SearchUser) => {
    setSelectedUser(u);
    setNewStudent((prev) => ({ ...emptyNewStudent, admission: prev.admission, note: prev.note, monthly: prev.monthly, student_id: prev.student_id, full_name: u.full_name, mobile: u.mobile, father_name: u.father_name, father_mobile: u.father_mobile, student_class: u.student_class }));
    setSearchResults([]);
    setSearchQuery("");
    setPhoneMatch(null);
    setPhoneChecked(false);
  };

  const subtotal = newStudent.admission.amount + newStudent.note.amount + newStudent.monthly.amount;
  const totalDiscount = feeDiscount(newStudent.admission) + feeDiscount(newStudent.note) + feeDiscount(newStudent.monthly);
  const finalAmount = feeTotal(newStudent.admission) + feeTotal(newStudent.note) + feeTotal(newStudent.monthly);

  const hasCapacityLimit = !!batch && batch.max_students > 0;
  const isFull = hasCapacityLimit && studentCount !== null && studentCount >= batch.max_students;
  const isNearFull = hasCapacityLimit && !isFull && studentCount !== null && batch.max_students - studentCount <= 3;

  const handleAddStudent = async () => {
    if (!batch) return;
    const fullName = newStudent.full_name.trim();
    const mobile = newStudent.mobile.trim();
    const reference = newStudent.payment_reference.trim();
    const studentId = newStudent.student_id.trim();
    if (!fullName) { toast.error("Full name is required"); return; }
    if (!mobile) { toast.error("Phone number is required"); return; }
    if (!studentId) { toast.error("Student ID is required"); return; }
    if (studentIdAvailable === false) { toast.error("This student ID is already in use"); return; }
    if (newStudent.payment_method === "online" && !reference) { toast.error("Reference/note is required for online payment"); return; }
    if (isFull && !overrideCapacity) { toast.error("This batch is at full capacity"); return; }
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      const enrollment = await batchApi.directEnroll(token, {
        user_id: selectedUser?.id,
        mobile,
        course_id: batch.course_id,
        batch_id: batch.id,
        amount: finalAmount,
        full_name: fullName,
        student_id: studentId,
        gender: newStudent.gender,
        student_class: newStudent.student_class,
        school: newStudent.school,
        shift: newStudent.school_shift,
        father_name: newStudent.father_name,
        father_mobile: newStudent.father_mobile,
        mother_name: newStudent.mother_name,
        mother_mobile: newStudent.mother_mobile,
        notification_mobile: newStudent.notification_mobile,
        address: newStudent.address,
        payment_method: newStudent.payment_method,
        reference,
      });
      toast.success("Student added to batch");
      setStudentCount((prev) => (prev !== null ? prev + 1 : prev));
      setSuccess({ enrollment, breakdown: newStudent });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add student");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 rounded-xl bg-secondary border-0 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";
  const formSelectCls = "w-full px-3 py-2.5 pr-10 rounded-xl bg-secondary border-0 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none bg-no-repeat bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236b7280%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22></polyline></svg>)] bg-[position:right_0.75rem_center]";

  if (loading) {
    return <div className="py-24 text-center text-muted-foreground">Loading...</div>;
  }

  if (!batch) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground mb-3">Batch not found</p>
        <button onClick={() => router.push("/admin/batches")} className="text-sm text-primary font-medium hover:underline">Back to Batches</button>
      </div>
    );
  }

  if (success) {
    const { enrollment, breakdown } = success;
    const feeRows = [
      { label: "Admission Fee", fee: breakdown.admission },
      { label: "Note Fee", fee: breakdown.note },
      { label: "Monthly Fee", fee: breakdown.monthly },
    ].filter((r) => r.fee.amount > 0);
    const billSubtotal = feeRows.reduce((sum, r) => sum + r.fee.amount, 0);
    const billDiscount = feeRows.reduce((sum, r) => sum + feeDiscount(r.fee), 0);

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="print:hidden bg-card rounded-2xl border border-border p-8 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 mx-auto text-success" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Student Added</h1>
            <p className="text-sm text-muted-foreground mt-1">{enrollment.full_name} was added to {batch.name}</p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button onClick={() => router.push(`/admin/batches/${batch.code || batch.id}`)} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors">Back to Batch</button>
            <button
              onClick={() => {
                setSuccess(null);
                setSelectedUser(null);
                setOverrideCapacity(false);
                setStudentIdAvailable(null);
                setNewStudent({
                  ...emptyNewStudent,
                  admission: { ...emptyFeeLine, amount: batch.admission_fee || 0 },
                  note: { ...emptyFeeLine, amount: batch.note_fee || 0 },
                  monthly: { ...emptyFeeLine, amount: batch.monthly_fee || 0 },
                });
                const token = getToken();
                if (token) {
                  batchApi.getNextStudentId(token, batch.id)
                    .then(({ student_id }) => setNewStudent((prev) => ({ ...prev, student_id })))
                    .catch(() => {});
                }
              }}
              className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors"
            >
              Add Another
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark transition-all"
            >
              <Printer className="w-4 h-4" />
              Generate Billing
            </button>
          </div>
        </div>

        {/* Printable invoice */}
        <div className="hidden print:block bg-card rounded-2xl border border-border p-8 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-foreground">EduNova — Payment Receipt</h2>
            <p className="text-xs text-muted-foreground">{new Date(enrollment.created_at).toLocaleString("en-BD")}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Student</p>
              <p className="font-medium text-foreground">{enrollment.full_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="font-medium text-foreground">{enrollment.mobile}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Batch</p>
              <p className="font-medium text-foreground">{batch.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Receipt No.</p>
              <p className="font-medium text-foreground">EN-{enrollment.id}</p>
            </div>
          </div>

          <table className="w-full text-sm border-t border-border pt-2">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-2">Item</th>
                <th className="py-2 text-right">Amount</th>
                <th className="py-2 text-right">Discount</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {feeRows.map((r) => (
                <tr key={r.label} className="border-t border-border">
                  <td className="py-2 text-foreground">{r.label}</td>
                  <td className="py-2 text-right text-foreground">৳{r.fee.amount}</td>
                  <td className="py-2 text-right text-foreground">৳{feeDiscount(r.fee)}</td>
                  <td className="py-2 text-right font-medium text-foreground">৳{feeTotal(r.fee)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="space-y-1 text-sm border-t border-border pt-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>৳{billSubtotal.toLocaleString()}</span>
            </div>
            {billDiscount > 0 && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Discount</span>
                <span>− ৳{billDiscount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex items-center justify-between font-semibold text-foreground pt-1 border-t border-border">
              <span>Total Paid</span>
              <span>৳{enrollment.amount.toLocaleString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm border-t border-border pt-2">
            <div>
              <p className="text-xs text-muted-foreground">Payment Type</p>
              <p className="font-medium text-foreground capitalize">{enrollment.payment_method}</p>
            </div>
            {enrollment.sent_from && (
              <div>
                <p className="text-xs text-muted-foreground">Reference</p>
                <p className="font-medium text-foreground">{enrollment.sent_from}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/admin/batches/${batch.code || batch.id}`)}
          className="p-2 rounded-xl hover:bg-secondary text-muted-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add Student</h1>
          <p className="text-sm text-muted-foreground mt-1">to {batch.name}</p>
        </div>
      </div>

      {hasCapacityLimit && studentCount !== null && (
        <div className={`flex items-center gap-2.5 rounded-xl px-4 py-3 border ${
          isFull
            ? "bg-destructive/5 border-destructive/20 text-destructive"
            : isNearFull
              ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-500"
              : "bg-secondary border-border text-muted-foreground"
        }`}>
          {isFull || isNearFull ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Users className="w-4 h-4 shrink-0" />}
          <p className="text-sm">
            <span className="font-semibold">{studentCount} / {batch.max_students}</span> students enrolled
            {isFull && " — this batch is at full capacity"}
            {isNearFull && " — nearly full"}
          </p>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-6 lg:items-start space-y-5 lg:space-y-0">
      <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
        {!selectedUser && (
          <div className="relative max-w-sm">
            <label className="block text-sm font-medium text-foreground mb-1.5">Search by phone or name</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type phone number or name..."
                className={`${inputClass} pl-10`}
              />
              {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
            </div>
            {searchQuery.trim().length >= 2 && !searching && (
              <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-card border border-border rounded-xl shadow-lg max-h-56 overflow-y-auto">
                {searchResults.length > 0 ? (
                  searchResults.map(u => (
                    <button
                      key={u.id}
                      onClick={() => selectUser(u)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-secondary/80 border-b border-border last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{u.full_name || "No name"}</p>
                        <p className="text-xs text-muted-foreground">{u.mobile}</p>
                        {u.batches.length > 0 && (
                          <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                            Already in: {u.batches.join(", ")}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-success font-medium shrink-0 ml-2">Select</span>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground px-4 py-3">No users found. Enter details below to create new account.</p>
                )}
              </div>
            )}
          </div>
        )}

        {selectedUser && (
          <div className="flex items-center justify-between bg-success/5 border border-success/20 rounded-xl p-3">
            <div>
              <p className="text-sm font-medium text-foreground">{selectedUser.full_name || "No name"}</p>
              <p className="text-xs text-muted-foreground">{selectedUser.mobile} &middot; Existing account</p>
            </div>
            <button onClick={() => { setSelectedUser(null); setNewStudent((prev) => ({ ...emptyNewStudent, admission: prev.admission, note: prev.note, monthly: prev.monthly })); }} className="text-xs text-primary hover:underline">Change</button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Student ID *</label>
            <div className="relative">
              <input
                value={newStudent.student_id}
                onChange={(e) => setNewStudent({ ...newStudent, student_id: e.target.value })}
                className={`${inputClass} pr-9 ${!studentIdChecking && newStudent.student_id.trim() && studentIdAvailable === false ? "ring-2 ring-destructive/40" : ""}`}
                placeholder="e.g. MATH0001"
              />
              {studentIdChecking && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
              {!studentIdChecking && newStudent.student_id.trim() && studentIdAvailable === true && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-success" />
              )}
              {!studentIdChecking && newStudent.student_id.trim() && studentIdAvailable === false && (
                <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
              )}
            </div>
            {!studentIdChecking && newStudent.student_id.trim() && studentIdAvailable === false && (
              <p className="mt-1.5 text-xs text-destructive">This student ID is already in use</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Full Name *</label>
            <input value={newStudent.full_name} onChange={(e) => setNewStudent({ ...newStudent, full_name: e.target.value })} className={inputClass} placeholder="Student name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Phone *</label>
            <div className="relative">
              <input
                value={newStudent.mobile}
                onChange={(e) => setNewStudent({ ...newStudent, mobile: e.target.value })}
                disabled={!!selectedUser}
                className={`${inputClass} ${selectedUser ? "cursor-not-allowed opacity-60" : ""} ${phoneChecking ? "pr-9" : ""}`}
                placeholder="01XXXXXXXXX"
              />
              {phoneChecking && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
            </div>
            {!selectedUser && phoneChecked && !phoneChecking && (
              phoneMatch ? (
                <div className="mt-1.5 flex items-center justify-between gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg px-3 py-2">
                  <p className="text-xs text-amber-700 dark:text-amber-500">
                    Existing account: {phoneMatch.full_name || "No name"}
                    {phoneMatch.batches.length > 0 && ` · Already in: ${phoneMatch.batches.join(", ")}`}
                  </p>
                  <button onClick={() => selectUser(phoneMatch)} className="text-xs font-medium text-primary hover:underline shrink-0">Use this account</button>
                </div>
              ) : (
                <p className="mt-1.5 text-xs text-muted-foreground">No existing account with this number — a new one will be created.</p>
              )
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Gender</label>
            <select value={newStudent.gender} onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value })} className={formSelectCls}>
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Class</label>
            <select value={newStudent.student_class} onChange={(e) => setNewStudent({ ...newStudent, student_class: e.target.value })} className={formSelectCls}>
              <option value="">Select class</option>
              {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">School</label>
            <input value={newStudent.school} onChange={(e) => setNewStudent({ ...newStudent, school: e.target.value })} className={inputClass} placeholder="School name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">School Shift</label>
            <select value={newStudent.school_shift} onChange={(e) => setNewStudent({ ...newStudent, school_shift: e.target.value })} className={formSelectCls}>
              <option value="">Select shift</option>
              <option value="morning">Morning</option>
              <option value="day">Day</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Father Name</label>
            <input value={newStudent.father_name} onChange={(e) => setNewStudent({ ...newStudent, father_name: e.target.value })} className={inputClass} placeholder="Father name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Father Mobile</label>
            <input value={newStudent.father_mobile} onChange={(e) => setNewStudent({ ...newStudent, father_mobile: e.target.value })} className={inputClass} placeholder="01XXXXXXXXX" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Mother Name</label>
            <input value={newStudent.mother_name} onChange={(e) => setNewStudent({ ...newStudent, mother_name: e.target.value })} className={inputClass} placeholder="Mother name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Mother Mobile</label>
            <input value={newStudent.mother_mobile} onChange={(e) => setNewStudent({ ...newStudent, mother_mobile: e.target.value })} className={inputClass} placeholder="01XXXXXXXXX" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1.5">Notification Mobile</label>
            <input value={newStudent.notification_mobile} onChange={(e) => setNewStudent({ ...newStudent, notification_mobile: e.target.value })} className={inputClass} placeholder="01XXXXXXXXX" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1.5">Address</label>
            <input value={newStudent.address} onChange={(e) => setNewStudent({ ...newStudent, address: e.target.value })} className={inputClass} placeholder="Present address" />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-6 space-y-4 mt-5 lg:mt-0">
          <h3 className="text-sm font-semibold text-foreground">Payment</h3>

          {([
            { key: "admission" as const, label: "Admission Fee" },
            { key: "note" as const, label: "Note Fee" },
            { key: "monthly" as const, label: "Monthly Fee" },
          ]).map(({ key, label }) => {
            const fee = newStudent[key];
            const lineDiscount = feeDiscount(fee);
            const lineTotal = feeTotal(fee);
            return (
              <div key={key} className="space-y-1.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">{label} (৳)</label>
                    <input
                      type="number"
                      value={fee.amount || ""}
                      onChange={(e) => setNewStudent({ ...newStudent, [key]: { ...fee, amount: Number(e.target.value) } })}
                      className={inputClass}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Discount</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={fee.discount_value || ""}
                        onChange={(e) => setNewStudent({ ...newStudent, [key]: { ...fee, discount_value: Number(e.target.value) } })}
                        className={`${inputClass} pr-20`}
                        placeholder="0"
                      />
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center bg-card border border-border rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setNewStudent({ ...newStudent, [key]: { ...fee, discount_type: "percentage" } })}
                          className={`px-2 py-1 text-xs font-medium transition-colors ${fee.discount_type === "percentage" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          %
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewStudent({ ...newStudent, [key]: { ...fee, discount_type: "fixed" } })}
                          className={`px-2 py-1 text-xs font-medium transition-colors ${fee.discount_type === "fixed" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          ৳
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  ৳{fee.amount} − ৳{lineDiscount} = <span className="font-semibold text-foreground">৳{lineTotal}</span>
                </p>
              </div>
            );
          })}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Payment Type</label>
              <select
                value={newStudent.payment_method}
                onChange={(e) => setNewStudent({ ...newStudent, payment_method: e.target.value as PaymentMethod, payment_reference: e.target.value === "cash" ? "" : newStudent.payment_reference })}
                className={formSelectCls}
              >
                <option value="cash">Cash</option>
                <option value="online">Online</option>
              </select>
            </div>
            {newStudent.payment_method === "online" && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Reference / Note *</label>
                <input
                  value={newStudent.payment_reference}
                  onChange={(e) => setNewStudent({ ...newStudent, payment_reference: e.target.value })}
                  className={inputClass}
                  placeholder="Transaction ID, sender number, etc."
                />
              </div>
            )}
          </div>

          <div className="space-y-1.5 bg-secondary rounded-xl px-4 py-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>৳{subtotal.toLocaleString()}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex items-center justify-between text-sm text-destructive">
                <span>Total Discount</span>
                <span>− ৳{totalDiscount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm font-semibold text-foreground pt-1.5 border-t border-border">
              <span>Total</span>
              <span>৳{finalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>
        </div>

        <div className="pt-2 border-t border-border space-y-3">
          {isFull && (
            <label className="flex items-center gap-2 text-sm text-destructive cursor-pointer">
              <input type="checkbox" checked={overrideCapacity} onChange={(e) => setOverrideCapacity(e.target.checked)} className="rounded border-border" />
              Add anyway, exceeding the batch&apos;s max capacity
            </label>
          )}
          <div className="flex items-center justify-end gap-3">
            <button onClick={() => router.push(`/admin/batches/${batch.code || batch.id}`)} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors">Cancel</button>
            <button
              onClick={handleAddStudent}
              disabled={saving || (isFull && !overrideCapacity)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Add to Batch
            </button>
          </div>
        </div>
    </div>
  );
}
