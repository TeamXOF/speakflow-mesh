"use client";

/**
 * Student signup — creates a PENDING account; a teacher approves it from the
 * Settings page before login works (role-based access flow).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AudioLines, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

export default function SignupPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const message = await register(name, username, password);
      setDone(true);
      setTimeout(() => router.replace("/login"), 2600);
      void message;
    } catch (err: any) {
      setError(err.message || "Could not create the account");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      <div className="speakflow-card w-full max-w-md p-8 bg-white shadow-xl">
        <div className="flex items-center gap-2.5 mb-6">
          <span className="h-10 w-10 rounded-xl bg-accent-primary flex items-center justify-center shadow">
            <AudioLines className="w-5 h-5 text-white" />
          </span>
          <p className="text-lg font-extrabold text-text-primary">SpeakFlow<span className="text-accent-primary-dark">AI</span></p>
        </div>

        {done ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-14 h-14 text-status-complete mx-auto mb-4" />
            <h1 className="text-xl font-extrabold text-text-primary mb-2">Account created! 🎉</h1>
            <p className="text-sm text-text-secondary leading-relaxed">
              Your teacher will approve it shortly. You&apos;ll be taken to the login page in a moment.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold text-text-primary">Join your class</h1>
            <p className="text-sm text-text-secondary mt-1 mb-6">
              Create your reader account. Your teacher approves new accounts before first login.
            </p>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-muted mb-1.5">
                  Your name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent-primary"
                  placeholder="e.g. Ayaan Khan"
                />
              </div>
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-muted mb-1.5">
                  Username
                </label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent-primary"
                  placeholder="letters, numbers, . _ -"
                />
              </div>
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-text-muted mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={4}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-accent-primary"
                  placeholder="at least 4 characters"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 rounded-xl bg-accent-primary-dark text-white text-sm font-bold shadow hover:bg-accent-primary transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                Create My Account
              </button>
            </form>

            <p className="text-sm text-text-secondary mt-6 text-center">
              Already have an account?{" "}
              <Link href="/login" className="font-bold text-accent-primary-dark hover:underline">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
