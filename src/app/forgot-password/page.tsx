"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { School, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"mobile" | "otp" | "password">("mobile");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.sendOTP(mobile);
      toast.success("OTP sent to your phone");
      setStep("otp");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send OTP";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.verifyOTP(mobile, otp);
      setStep("password");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid OTP";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await api.login(mobile, newPassword);
      toast.success("Password reset successful! Please login.");
      window.location.href = "/login";
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reset password";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-primary">
              <School className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">EduNova</span>
          </Link>
          <h1 className="text-2xl font-extrabold text-foreground">Reset Password</h1>
          <p className="mt-2 text-muted-foreground">
            {step === "mobile" && "Enter your mobile number to receive a verification code"}
            {step === "otp" && "Enter the 6-digit code sent to your phone"}
            {step === "password" && "Enter your new password"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl shadow-sm-custom p-6">
          {/* Error Banner */}
          {error && (
            <div className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Mobile */}
          {step === "mobile" && (
            <form onSubmit={handleSendOTP} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Mobile Number</label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => { setMobile(e.target.value); setError(""); }}
                  placeholder="01XXXXXXXXX"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold shadow-primary hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send OTP"}
              </button>
            </form>
          )}

          {/* Step 2: OTP */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Verification Code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-center text-lg tracking-[0.3em] font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold shadow-primary hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Code"}
              </button>
              <button
                type="button"
                onClick={() => setStep("mobile")}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Change mobile number
              </button>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === "password" && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                  placeholder="At least 6 characters"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold shadow-primary hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reset Password"}
              </button>
            </form>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
