"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, type Course } from "@/lib/api";
import Navbar from "@/components/navbar";
import {
  School,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Shield,
  CreditCard,
  Smartphone,
  User,
  Phone,
  GraduationCap,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";

export default function EnrollPage() {
  const params = useParams();
  const id = params.id as string;
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCourse(Number(id))
      .then((data) => setCourse(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const [form, setForm] = useState({
    fullName: "",
    mobile: "",
    confirmMobile: "",
    paymentMethod: "manual",
    mobileBanking: "bkash",
    amount: "",
    sentFrom: "",
    sentTo: "",
    referralSource: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (course) {
      setForm((prev) => ({ ...prev, amount: course.price.toString() }));
    }
  }, [course]);

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.fullName || form.fullName.length < 3) {
      setError("Please enter your full name");
      return;
    }
    if (!form.mobile || form.mobile.length < 10) {
      setError("Please enter a valid mobile number");
      return;
    }
    if (form.mobile !== form.confirmMobile) {
      setError("Mobile numbers do not match");
      return;
    }
    if (form.paymentMethod === "manual") {
      if (!form.sentFrom || form.sentFrom.length < 10) {
        setError("Please enter the number you sent payment from");
        return;
      }
      if (!form.sentTo || form.sentTo.length < 10) {
        setError("Please enter the merchant number you sent payment to");
        return;
      }
      if (!form.amount || Number(form.amount) < (course?.price || 0)) {
        setError(`Minimum payment is ৳${(course?.price || 0).toLocaleString()}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await api.createEnrollment({
        course_id: Number(id),
        full_name: form.fullName,
        mobile: form.mobile,
        payment_method: form.paymentMethod,
        mobile_banking: form.mobileBanking,
        amount: Number(form.amount),
        sent_from: form.sentFrom,
        sent_to: form.sentTo,
        referral_source: form.referralSource,
      });
      setSuccess(true);
      toast.success("Enrollment submitted! We'll verify your payment shortly.");
    } catch {
      setError("Failed to submit enrollment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground text-lg">Course not found</p>
          <Link href="/courses" className="mt-4 inline-block text-primary font-semibold hover:underline">
            Browse Courses
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">Enrollment Submitted!</h1>
          <p className="mt-3 text-muted-foreground">
            Your enrollment for <span className="font-semibold text-foreground">{course.title}</span> has been submitted.
            We&apos;ll verify your payment and activate your course within 24 hours.
          </p>
          <div className="mt-8 space-y-3">
            <Link
              href={`/courses/${id}`}
              className="block w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold text-center shadow-primary hover:shadow-lg transition-all"
            >
              View Course Details
            </Link>
            <Link
              href="/courses"
              className="block w-full py-3 rounded-xl border border-border text-foreground font-semibold text-center hover:bg-secondary transition-colors"
            >
              Browse More Courses
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Header ───────────────────────────────── */}
      <section className={`bg-gradient-to-br ${course.gradient || "from-primary to-primary-dark"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href={`/courses/${id}`} className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to course
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Checkout</h1>
          <p className="mt-1 text-white/70">{course.title}</p>
        </div>
      </section>

      {/* ── Content ──────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Error Banner */}
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Student Information */}
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm-custom">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Student Information</h2>
                    <p className="text-sm text-muted-foreground">Your course will be registered with this info</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Full Name *</label>
                    <input
                      type="text"
                      value={form.fullName}
                      onChange={(e) => update("fullName", e.target.value)}
                      placeholder="Enter student's full name"
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Course will be registered under this name</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Mobile Number *</label>
                      <input
                        type="tel"
                        value={form.mobile}
                        onChange={(e) => update("mobile", e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">Course will be registered with this number</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Confirm Mobile *</label>
                      <input
                        type="tel"
                        value={form.confirmMobile}
                        onChange={(e) => update("confirmMobile", e.target.value)}
                        placeholder="Re-enter mobile number"
                        className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm-custom">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Payment Method</h2>
                    <p className="text-sm text-muted-foreground">Choose how you want to pay</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${form.paymentMethod === "digital" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="digital"
                      checked={form.paymentMethod === "digital"}
                      onChange={(e) => update("paymentMethod", e.target.value)}
                      className="w-4 h-4 text-primary"
                    />
                    <Smartphone className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-semibold text-foreground">Digital Payment (bKash)</p>
                      <p className="text-xs text-muted-foreground">Pay directly through bKash app</p>
                    </div>
                  </label>

                  <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${form.paymentMethod === "manual" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="manual"
                      checked={form.paymentMethod === "manual"}
                      onChange={(e) => update("paymentMethod", e.target.value)}
                      className="w-4 h-4 text-primary"
                    />
                    <CreditCard className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-semibold text-foreground">Manual Payment</p>
                      <p className="text-xs text-muted-foreground">Send money to merchant and fill the form</p>
                    </div>
                  </label>
                </div>

                {/* Manual Payment Details */}
                {form.paymentMethod === "manual" && (
                  <div className="mt-6 space-y-5">
                    {/* Merchant Numbers */}
                    <div className="bg-secondary/50 rounded-xl p-5">
                      <p className="text-sm font-semibold text-foreground mb-3">📱 Send payment to any of these numbers:</p>
                      <div className="space-y-2">
                        {[
                          { name: "bKash", number: "01XXXXXXXXX", color: "text-pink-500" },
                          { name: "Nagad", number: "01XXXXXXXXX", color: "text-orange-500" },
                          { name: "Rocket", number: "01XXXXXXXXX", color: "text-purple-500" },
                        ].map((m) => (
                          <div key={m.name} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                            <span className={`font-semibold text-sm ${m.color}`}>{m.name} Merchant</span>
                            <span className="font-mono font-bold text-foreground">{m.number}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Payment Form */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Mobile Banking Used *</label>
                        <select
                          value={form.mobileBanking}
                          onChange={(e) => update("mobileBanking", e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                          <option value="bkash">bKash</option>
                          <option value="nagad">Nagad</option>
                          <option value="rocket">Rocket</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">Amount Sent (৳) *</label>
                        <input
                          type="number"
                          value={form.amount}
                          onChange={(e) => update("amount", e.target.value)}
                          min={course.price}
                          className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">Sent From Number *</label>
                          <input
                            type="tel"
                            value={form.sentFrom}
                            onChange={(e) => update("sentFrom", e.target.value)}
                            placeholder="Your number"
                            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1.5">Sent To Number *</label>
                          <input
                            type="tel"
                            value={form.sentTo}
                            onChange={(e) => update("sentTo", e.target.value)}
                            placeholder="Merchant number"
                            className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Referral Source */}
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm-custom">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">How did you hear about us?</h2>
                    <p className="text-sm text-muted-foreground">Optional — helps us improve</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {["Google/Bing", "YouTube", "Facebook", "Friend/Family", "Previous Student"].map((source) => (
                    <button
                      key={source}
                      type="button"
                      onClick={() => update("referralSource", source)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                        form.referralSource === source
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      {source}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold text-lg shadow-primary hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Complete Enrollment"
                )}
              </button>

              <p className="text-center text-xs text-muted-foreground">
                By completing your purchase, you agree to our{" "}
                <Link href="#" className="text-primary hover:underline">Terms of Service</Link>
                {" "}and{" "}
                <Link href="#" className="text-primary hover:underline">Privacy Policy</Link>
              </p>
            </form>
          </div>

          {/* ── Sidebar ────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              {/* Order Summary */}
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm-custom">
                <h3 className="font-bold text-foreground mb-4">Order Summary</h3>
                <div className={`p-4 rounded-xl bg-gradient-to-br ${course.gradient || "from-primary to-primary-dark"} mb-4`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{course.title}</p>
                      <p className="text-white/70 text-xs">{course.duration || "TBD"}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Course Fee</span>
                    <span className="font-semibold text-foreground">৳{course.price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-semibold text-success">-৳0</span>
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="text-xl font-extrabold text-primary">৳{course.price.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="bg-card rounded-2xl border border-border p-5 shadow-sm-custom">
                <div className="space-y-3">
                  {[
                    { icon: Shield, text: "30-day money-back guarantee", color: "text-success" },
                    { icon: CheckCircle2, text: "Instant course activation", color: "text-primary" },
                    { icon: Phone, text: "24/7 support available", color: "text-accent" },
                  ].map((badge) => (
                    <div key={badge.text} className="flex items-center gap-2.5">
                      <badge.icon className={`w-4 h-4 ${badge.color} shrink-0`} />
                      <span className="text-sm text-muted-foreground">{badge.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Need Help */}
              <div className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-5 text-white">
                <h3 className="font-bold mb-2">Need Help?</h3>
                <p className="text-white/80 text-sm mb-3">Contact us if you have any issues with payment.</p>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 text-white text-sm font-semibold hover:bg-white/30 transition-colors"
                >
                  Contact Support
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────── */}
      <footer className="border-t border-border mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                <School className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-foreground">EduNova</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
              <Link href="/courses" className="hover:text-foreground transition-colors">Courses</Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            </div>
            <p className="text-sm text-muted-foreground">&copy; 2026 EduNova. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
