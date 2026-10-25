"use client";

/**
 * Login — SpeakFlow Dual Login (Student & Teacher).
 * Features a balanced 2-column card with a contained role switcher,
 * clean responsive typography, and no exposed credentials.
 */

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AudioLines, Loader2, Lock, User, Sparkles, GraduationCap, ShieldCheck, ArrowRight, BookOpen } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

type RoleMode = "student" | "teacher";

function BrandPanel({ mode }: { mode: RoleMode }) {
  return (
    <div className="hidden md:flex md:w-1/2 flex-col justify-between bg-gradient-to-br from-accent-primary-bg via-white to-accent-secondary-bg p-8 lg:p-10 border-r border-gray-100 relative overflow-hidden">
      <div className="flex items-center gap-3 relative z-10">
        <span className="h-11 w-11 rounded-2xl bg-accent-primary flex items-center justify-center shadow-md shrink-0">
          <AudioLines className="w-6 h-6 text-white" />
        </span>
        <div>
          <p className="text-xl font-extrabold text-text-primary tracking-tight">
            SpeakFlow<span className="text-accent-primary-dark">AI</span>
          </p>
          <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
            {mode === "teacher" ? "Educator Diagnostic Control" : "Listen · Understand · Practice"}
          </p>
        </div>
      </div>

      <div className="my-8 relative z-10">
        {mode === "student" ? (
          <>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold mb-4">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Story Mode &amp; Star Adventures</span>
            </div>
            <p className="text-2xl font-extrabold text-text-primary leading-snug">
              Read aloud,<br />
              earn shining stars,<br />
              <span className="text-accent-primary-dark">and level up your fluency!</span>
            </p>
          </>
        ) : (
          <>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold mb-4">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Teacher Diagnostic Intelligence</span>
            </div>
            <p className="text-2xl font-extrabold text-text-primary leading-snug">
              Listen to how every child reads.<br />
              Pinpoint exact sound struggles.<br />
              <span className="text-accent-primary-dark">One teacher. Every student.</span>
            </p>
          </>
        )}

        <div className="flex gap-2 mt-6">
          <span className="h-3 w-3 rounded-full bg-accent-primary animate-pulse" />
          <span className="h-3 w-3 rounded-full bg-accent-secondary" />
          <span className="h-3 w-3 rounded-full bg-status-complete" />
          <span className="h-3 w-3 rounded-full bg-status-anxious" />
        </div>
      </div>

      <div className="relative z-10 border-t border-gray-100 pt-4 flex items-center justify-between text-xs text-text-muted">
        <span>Acoustic AI Evidence</span>
        <span>English &amp; اردو</span>
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();

  const initialRole: RoleMode = params.get("role") === "teacher" ? "teacher" : "student";
  const [mode, setMode] = useState<RoleMode>(initialRole);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  // Sync mode from query param if changed
  useEffect(() => {
    const qRole = params.get("role");
    if (qRole === "teacher" || qRole === "student") {
      setMode(qRole);
    }
  }, [params]);

  const switchMode = (newMode: RoleMode) => {
    setMode(newMode);
    setError("");
    setNotice("");
    setUsername("");
    setPassword("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);

    try {
      const user = await login(username, password);

      // Verify selected tab aligns with user role, or gently inform them
      if (mode === "student" && user.role === "teacher") {
        setNotice("Recognized as Teacher. Redirecting to Educator Hub...");
        setTimeout(() => router.replace("/teacher"), 800);
        return;
      }
      if (mode === "teacher" && user.role === "student") {
        setNotice("Recognized as Student. Redirecting to your Reading Journey...");
        setTimeout(() => router.replace(user.student_id ? "/read" : "/dashboard"), 800);
        return;
      }

      const next = params.get("next");
      if (next && next !== "/") {
        router.replace(next);
      } else {
        router.replace(user.role === "teacher" ? "/teacher" : "/read");
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your username and password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="speakflow-card w-full max-w-4xl flex flex-col md:flex-row overflow-hidden shadow-2xl rounded-3xl border border-gray-100 bg-white">
        <BrandPanel mode={mode} />

        {/* Form side */}
        <div className="flex-1 md:w-1/2 p-6 sm:p-8 md:p-10 bg-white flex flex-col justify-between">
          <div>
            {/* Mobile Header */}
            <div className="md:hidden flex items-center gap-2 mb-6">
              <span className="h-9 w-9 rounded-xl bg-accent-primary flex items-center justify-center">
                <AudioLines className="w-5 h-5 text-white" />
              </span>
              <p className="text-lg font-extrabold text-text-primary">
                SpeakFlow<span className="text-accent-primary-dark">AI</span>
              </p>
            </div>

            {/* Role Segmented Switcher */}
            <div className="mb-6">
              <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-muted mb-2 text-center">
                Select Your Role
              </p>
              <div className="grid grid-cols-2 p-1 bg-gray-100/90 rounded-2xl border border-gray-200/60">
                <button
                  type="button"
                  onClick={() => switchMode("student")}
                  className={`py-2.5 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
                    mode === "student"
                      ? "bg-white text-amber-700 shadow-sm border border-gray-200/60"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span>Student Login</span>
                </button>

                <button
                  type="button"
                  onClick={() => switchMode("teacher")}
                  className={`py-2.5 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
                    mode === "teacher"
                      ? "bg-white text-indigo-700 shadow-sm border border-gray-200/60"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  <GraduationCap className="w-4 h-4 shrink-0" />
                  <span>Teacher Login</span>
                </button>
              </div>
            </div>

            {/* Mode-specific Greetings */}
            {mode === "student" ? (
              <div className="mb-6">
                <div className="flex items-center gap-2 text-amber-600 font-bold text-xs uppercase tracking-wider mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span>Young Reader Portal</span>
                </div>
                <h1 className="text-2xl font-extrabold text-text-primary">Welcome, Explorer! 🌟</h1>
                <p className="text-sm text-text-secondary mt-1">
                  Enter your student credentials to practice, earn stars, and play stories.
                </p>
              </div>
            ) : (
              <div className="mb-6">
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Teacher &amp; Administrator Portal</span>
                </div>
                <h1 className="text-2xl font-extrabold text-text-primary">Educator Control Room</h1>
                <p className="text-sm text-text-secondary mt-1">
                  Sign in to inspect class accuracy, speech analytics, and student rosters.
                </p>
              </div>
            )}

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium animate-in fade-in">
                {error}
              </div>
            )}

            {notice && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium animate-in fade-in flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>{notice}</span>
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-muted mb-1.5">
                  {mode === "student" ? "Student Username" : "Teacher Username"}
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoFocus
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent-primary transition-all"
                    placeholder={mode === "student" ? "e.g. kid1 or your username" : "e.g. teacher"}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-muted mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent-primary transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className={`w-full py-3.5 rounded-xl text-white text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2 ${
                  mode === "student"
                    ? "bg-amber-600 hover:bg-amber-500"
                    : "bg-indigo-600 hover:bg-indigo-500"
                }`}
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{mode === "student" ? "Start Reading Adventure" : "Enter Teacher Hub"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer note */}
          <div className="mt-8 pt-4 border-t border-gray-100 text-center">
            {mode === "student" ? (
              <p className="text-sm text-text-secondary">
                Don&apos;t have an account yet?{" "}
                <Link href="/signup" className="font-bold text-amber-700 hover:underline">
                  Sign up here
                </Link>
              </p>
            ) : (
              <p className="text-xs text-text-muted">
                Need to approve students? Log in above to manage your classroom roster.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg-base flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-accent-primary-dark animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
