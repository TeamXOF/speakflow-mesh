"use client";

/**
 * Login — SpeakFlow-themed (cream background, lavender accents, card UI).
 * Teachers and students both sign in here; students must be approved first.
 */

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AudioLines, Loader2, Lock, User } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { homeFor } from "@/components/auth/AuthGate";

function BrandPanel() {
  return (
    <div className="hidden md:flex flex-col justify-between bg-gradient-to-br from-accent-primary-bg to-accent-secondary-bg p-10 border-r border-gray-100">
      <div className="flex items-center gap-3">
        <span className="h-11 w-11 rounded-2xl bg-accent-primary flex items-center justify-center shadow">
          <AudioLines className="w-6 h-6 text-white" />
        </span>
        <div>
          <p className="text-xl font-extrabold text-text-primary">SpeakFlow<span className="text-accent-primary-dark">AI</span></p>
          <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Every reader. Every day.</p>
        </div>
      </div>
      <div>
        <p className="text-2xl font-extrabold text-text-primary leading-snug">
          Listen to how a child reads.<br />
          Understand why they struggle.<br />
          <span className="text-accent-primary-dark">Practice, every day.</span>
        </p>
        <div className="flex gap-2 mt-6">
          <span className="h-3 w-3 rounded-full bg-accent-primary" />
          <span className="h-3 w-3 rounded-full bg-accent-secondary" />
          <span className="h-3 w-3 rounded-full bg-status-complete" />
          <span className="h-3 w-3 rounded-full bg-status-anxious" />
        </div>
      </div>
      <p className="text-xs text-text-muted">Acoustic evidence · AI feedback · Urdu &amp; English</p>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await login(username, password);
      const next = params.get("next");
      router.replace(next && next !== "/" ? next : homeFor(user.role));
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="speakflow-card w-full max-w-3xl flex overflow-hidden shadow-xl">
        <BrandPanel />

        {/* Form side */}
        <div className="flex-1 p-8 md:p-10 bg-white">
          <div className="md:hidden flex items-center gap-2 mb-6">
            <span className="h-9 w-9 rounded-xl bg-accent-primary flex items-center justify-center">
              <AudioLines className="w-5 h-5 text-white" />
            </span>
            <p className="text-lg font-extrabold text-text-primary">SpeakFlow<span className="text-accent-primary-dark">AI</span></p>
          </div>

          <h1 className="text-2xl font-extrabold text-text-primary">Welcome back!</h1>
          <p className="text-sm text-text-secondary mt-1 mb-6">Sign in to continue your reading journey.</p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-muted mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent-primary"
                  placeholder="your username"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-muted mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent-primary"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 rounded-xl bg-accent-primary-dark text-white text-sm font-bold shadow hover:bg-accent-primary transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign In
            </button>
          </form>

          <p className="text-sm text-text-secondary mt-6 text-center">
            New student?{" "}
            <Link href="/signup" className="font-bold text-accent-primary-dark hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent-primary-dark animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
