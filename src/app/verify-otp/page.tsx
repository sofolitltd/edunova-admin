"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { School, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

function VerifyOTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mobile = searchParams.get("mobile") || sessionStorage.getItem("edunova_pending_mobile") || "";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(120);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every((d) => d !== "")) {
      handleVerify(newOtp.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) {
      const newOtp = pasted.split("").concat(Array(6).fill("")).slice(0, 6);
      setOtp(newOtp);
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
      if (pasted.length === 6) handleVerify(pasted);
    }
  };

  const handleVerify = async (code: string) => {
    if (!mobile) return;
    setLoading(true);
    try {
      await api.verifyOTP(mobile, code);
      setSuccess(true);
      toast.success("Phone verified successfully!");
      sessionStorage.removeItem("edunova_pending_mobile");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid OTP";
      setError(message);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!mobile || countdown > 0) return;
    setResending(true);
    try {
      await api.resendOTP(mobile);
      toast.success("OTP resent successfully!");
      setCountdown(120);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to resend OTP";
      setError(message);
    } finally {
      setResending(false);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-primary">
            <School className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">EduNova</span>
        </Link>

        {success ? (
          <>
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <h1 className="text-2xl font-extrabold text-foreground">Verified!</h1>
            <p className="mt-2 text-muted-foreground">Redirecting to login...</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold text-foreground">Verify Phone</h1>
            <p className="mt-2 text-muted-foreground">
              Enter the 6-digit code sent to
            </p>
            <p className="text-foreground font-semibold mt-1">{mobile}</p>
          </>
        )}
      </div>

      {!success && (
        <>
          {error && (
            <div className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-center gap-3 mb-8">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                disabled={loading}
                className="w-12 h-14 text-center text-xl font-bold rounded-xl bg-card border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50"
              />
            ))}
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 mb-6 text-primary">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Verifying...</span>
            </div>
          )}

          <div className="text-center">
            {countdown > 0 ? (
              <p className="text-sm text-muted-foreground">
                Resend code in <span className="font-semibold text-foreground">{formatTime(countdown)}</span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-sm text-primary font-semibold hover:underline disabled:opacity-50"
              >
                {resending ? "Resending..." : "Resend OTP"}
              </button>
            )}
          </div>

          <div className="mt-8 text-center">
            <Link href="/register" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to register
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function VerifyOTPPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        }
      >
        <VerifyOTPContent />
      </Suspense>
    </div>
  );
}
