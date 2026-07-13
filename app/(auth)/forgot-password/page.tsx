"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import {
  ArrowLeft,
  Mail,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const emailSchema = z.object({
  email: z.string().email("Enter a valid email"),
});
const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  });

type EmailForm = z.infer<typeof emailSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COOLDOWN = 60;

function ErrorBox({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div className="mb-4 px-4 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
      {msg}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Step = "email" | "otp" | "password" | "done";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // ── Step 1: email ──────────────────────────────────────────────────────────

  const emailForm = useForm<EmailForm>({ resolver: zodResolver(emailSchema) });

  const onEmailSubmit = async (data: EmailForm) => {
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.email }),
    });
    setEmail(data.email.toLowerCase().trim());
    setCooldown(COOLDOWN);
    setStep("otp");
  };

  // ── Step 2: OTP ────────────────────────────────────────────────────────────

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (step === "otp") inputRefs.current[0]?.focus();
  }, [step]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const verifyCode = useCallback(
    async (code: string) => {
      setOtpLoading(true);
      setOtpError("");
      try {
        const res = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, mode: "forgot-password", email }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setOtpError(data.error ?? "Verification failed");
          return;
        }
        setStep("password");
      } catch {
        setOtpError("Network error. Try again.");
      } finally {
        setOtpLoading(false);
      }
    },
    [email],
  );

  const handleOtpChange = (i: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[i] = value;
    setOtp(next);
    setOtpError("");
    if (value && i < 5) inputRefs.current[i + 1]?.focus();
    if (value && i === 5 && next.every(Boolean)) verifyCode(next.join(""));
  };

  const handleOtpKeyDown = (
    i: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[i] && i > 0)
      inputRefs.current[i - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = Array(6).fill("") as string[];
    text.split("").forEach((d, i) => {
      next[i] = d;
    });
    setOtp(next);
    setOtpError("");
    inputRefs.current[Math.min(text.length - 1, 5)]?.focus();
    if (text.length === 6) verifyCode(text);
  };

  const handleResend = async () => {
    setResending(true);
    setOtpError("");
    setOtp(["", "", "", "", "", ""]);
    inputRefs.current[0]?.focus();
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setCooldown(COOLDOWN);
    setResending(false);
  };

  // ── Step 3: new password ───────────────────────────────────────────────────

  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [resetError, setResetError] = useState("");
  const pwForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });
  const pw = pwForm.watch("password", "");
  const checks = {
    length: pw.length >= 8,
    upper: /[A-Z]/.test(pw),
    number: /[0-9]/.test(pw),
  };

  const onPasswordSubmit = async (data: PasswordForm) => {
    setResetError("");
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        code: otp.join(""),
        newPassword: data.password,
      }),
    });
    const result = (await res.json()) as { error?: string };
    if (!res.ok) {
      setResetError(result.error ?? "Failed to reset password");
      return;
    }
    setStep("done");
    setTimeout(() => router.push("/login"), 2000);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  // Step: done
  if (step === "done")
    return (
      <div className="glass rounded-2xl border border-border/60 p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-green-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Password updated!</h1>
        <p className="text-sm text-muted-foreground">
          Redirecting you to sign in…
        </p>
      </div>
    );

  // Step: OTP
  if (step === "otp") {
    const filled = otp.filter(Boolean).length;
    return (
      <div className="glass rounded-2xl border border-border/60 p-8 text-center">
        <button
          onClick={() => setStep("email")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto mb-5">
          <Mail className="w-7 h-7 text-brand" />
        </div>
        <h1 className="text-2xl font-bold mb-1">Check your inbox</h1>
        <p className="text-sm text-muted-foreground mb-1">
          We sent a 6-digit code to
        </p>
        <p className="text-sm font-medium text-foreground mb-7">{email}</p>

        <div
          className="flex justify-center gap-2 mb-5"
          onPaste={handleOtpPaste}
        >
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              disabled={otpLoading}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(i, e)}
              className={[
                "w-11 h-14 text-center text-xl font-bold rounded-xl border transition-all outline-none bg-muted/50 text-foreground",
                digit
                  ? "border-brand ring-2 ring-brand/20"
                  : "border-border focus:border-brand focus:ring-2 focus:ring-brand/20",
                otpLoading ? "opacity-50 cursor-not-allowed" : "",
              ].join(" ")}
            />
          ))}
        </div>

        <ErrorBox msg={otpError} />

        <Button
          onClick={() => {
            if (filled === 6) verifyCode(otp.join(""));
          }}
          disabled={filled < 6 || otpLoading}
          className="w-full bg-brand text-white hover:bg-brand/90 border-0 mb-5"
        >
          {otpLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying…
            </>
          ) : (
            "Verify code"
          )}
        </Button>

        <p className="text-sm text-muted-foreground">
          Didn&apos;t get the code?{" "}
          {cooldown > 0 ? (
            <span className="text-muted-foreground/50">
              Resend in {cooldown}s
            </span>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-brand hover:underline disabled:opacity-50 inline-flex items-center gap-1"
            >
              {resending && <RotateCcw className="w-3 h-3 animate-spin" />}
              Resend code
            </button>
          )}
        </p>
      </div>
    );
  }

  // Step: new password
  if (step === "password")
    return (
      <div className="glass rounded-2xl border border-border/60 p-8">
        <div className="mb-7">
          <h1 className="text-2xl font-bold mb-1">Set new password</h1>
          <p className="text-sm text-muted-foreground">
            Choose a strong password for your account.
          </p>
        </div>

        <ErrorBox msg={resetError} />

        <form
          onSubmit={pwForm.handleSubmit(onPasswordSubmit)}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="pw">New password</Label>
            <div className="relative">
              <Input
                id="pw"
                type={showPw ? "text" : "password"}
                placeholder="Create a strong password"
                autoComplete="new-password"
                {...pwForm.register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPw ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {pw && (
              <div className="flex gap-4 mt-1.5">
                {Object.entries(checks).map(([k, ok]) => (
                  <span
                    key={k}
                    className={`text-[11px] ${ok ? "text-green-400" : "text-muted-foreground"}`}
                  >
                    {ok ? "✓" : "·"}{" "}
                    {k === "length"
                      ? "8+ chars"
                      : k === "upper"
                        ? "Uppercase"
                        : "Number"}
                  </span>
                ))}
              </div>
            )}
            {pwForm.formState.errors.password && (
              <p className="text-xs text-destructive">
                {pwForm.formState.errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cf">Confirm password</Label>
            <div className="relative">
              <Input
                id="cf"
                type={showCf ? "text" : "password"}
                placeholder="Repeat your password"
                autoComplete="new-password"
                {...pwForm.register("confirm")}
              />
              <button
                type="button"
                onClick={() => setShowCf((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCf ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {pwForm.formState.errors.confirm && (
              <p className="text-xs text-destructive">
                {pwForm.formState.errors.confirm.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-brand text-white hover:bg-brand/90 border-0"
            disabled={pwForm.formState.isSubmitting}
          >
            {pwForm.formState.isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating…
              </>
            ) : (
              "Update password"
            )}
          </Button>
        </form>
      </div>
    );

  // Step: email (default)
  return (
    <div className="glass rounded-2xl border border-border/60 p-8">
      <Link
        href="/login"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to sign in
      </Link>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Reset your password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send a 6-digit code.
        </p>
      </div>

      <form
        onSubmit={emailForm.handleSubmit(onEmailSubmit)}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            {...emailForm.register("email")}
          />
          {emailForm.formState.errors.email && (
            <p className="text-xs text-destructive">
              {emailForm.formState.errors.email.message}
            </p>
          )}
        </div>
        <Button
          type="submit"
          className="w-full bg-brand text-white hover:bg-brand/90 border-0"
          disabled={emailForm.formState.isSubmitting}
        >
          {emailForm.formState.isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending…
            </>
          ) : (
            "Send code"
          )}
        </Button>
      </form>
    </div>
  );
}
