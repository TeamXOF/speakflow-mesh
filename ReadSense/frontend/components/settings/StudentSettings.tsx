"use client";

/**
 * Student Settings — the kid-facing slice (teachers keep the full System
 * Settings page). Sections:
 *   My Profile          — name, username, class, stars (read-only)
 *   Reading Preferences — preferred mic, story language, word tips, text size
 *   Password            — change password (real backend endpoint)
 *   Privacy             — honest note: audio is analyzed live, never stored
 */

import { useEffect, useState } from "react";
import {
  User, Mic, Languages, Lightbulb, Type, KeyRound, ShieldCheck, Star, Loader2, Check,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useSpeakFlow } from "@/context/SpeakFlowContext";
import { changePassword, fetchStudentDashboard, StudentDashboard } from "@/lib/api";
import { loadPrefs, savePrefs, StudentPrefs } from "@/lib/prefs";

function Toggle({ on, onChange, label, hint, icon: Icon }: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint: string;
  icon: React.ElementType;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-accent-primary transition-colors text-left"
    >
      <span className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-accent-primary-dark shrink-0" />
        <span>
          <span className="block text-sm font-bold text-text-primary">{label}</span>
          <span className="block text-xs text-text-muted">{hint}</span>
        </span>
      </span>
      <span
        className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${on ? "bg-accent-primary-dark" : "bg-gray-200"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}

export default function StudentSettings() {
  const { user } = useAuth();
  const { addNotification } = useSpeakFlow();
  const [prefs, setPrefs] = useState<StudentPrefs | null>(null);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [dash, setDash] = useState<StudentDashboard | null>(null);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    setPrefs(loadPrefs());
    // Mic labels only populate after permission was granted at least once
    navigator.mediaDevices?.enumerateDevices?.()
      .then((devices) => setMics(devices.filter((d) => d.kind === "audioinput")))
      .catch(() => {});
    if (user?.student_id) {
      fetchStudentDashboard(user.student_id, "all")
        .then(setDash)
        .catch(() => {});
    }
  }, [user?.student_id]);

  const update = (patch: Partial<StudentPrefs>) => {
    const merged = savePrefs(patch);
    setPrefs(merged);
    addNotification({ title: "Preference saved", message: "Applied to your reading screens.", type: "success" });
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw) {
      addNotification({ title: "Fill both fields", message: "Enter your current and a new password.", type: "warning" });
      return;
    }
    if (newPw.length < 4) {
      addNotification({ title: "Too short", message: "New password needs at least 4 characters.", type: "warning" });
      return;
    }
    if (newPw !== confirmPw) {
      addNotification({ title: "Passwords don't match", message: "The two new password fields are different.", type: "warning" });
      return;
    }
    setSavingPw(true);
    try {
      await changePassword(currentPw, newPw);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      addNotification({ title: "Password updated", message: "Use your new password next time you log in.", type: "success" });
    } catch (err: any) {
      addNotification({ title: "Could not change password", message: err.message, type: "error" });
    } finally {
      setSavingPw(false);
    }
  };

  const initials = (user?.name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const micLabel = (d: MediaDeviceInfo, i: number) => d.label || `Microphone ${i + 1}`;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-sans text-text-primary">My Settings</h1>
          <p className="text-sm text-text-secondary mt-1">Your profile and reading preferences.</p>
        </div>
      </div>

      {/* My profile */}
      <div className="speakflow-card bg-white p-6">
        <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center">
          <User className="w-5 h-5 mr-2 text-text-secondary" /> My Profile
        </h2>
        <div className="flex items-center gap-4">
          <span className="h-14 w-14 rounded-full bg-accent-primary-bg border-2 border-accent-primary-dark/30 flex items-center justify-center text-lg font-extrabold text-accent-primary-dark">
            {initials}
          </span>
          <div className="flex-1">
            <p className="text-lg font-extrabold text-text-primary">{user?.name}</p>
            <p className="text-sm text-text-secondary">
              @{user?.username}
              {dash && <> · Grade {dash.student.grade} · {dash.student.level}</>}
            </p>
          </div>
          {dash && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-600 text-sm font-bold">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> {dash.summary.stars}
            </span>
          )}
        </div>
        <p className="text-xs text-text-muted mt-4">
          To change your name, class or level, ask your teacher — they manage student details.
        </p>
      </div>

      {/* Reading preferences */}
      <div className="speakflow-card bg-white p-6">
        <h2 className="text-lg font-bold text-text-primary mb-4">Reading Preferences</h2>
        {!prefs ? (
          <Loader2 className="w-6 h-6 text-accent-primary-dark animate-spin" />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200">
              <Mic className="w-4 h-4 text-accent-primary-dark shrink-0" />
              <div className="flex-1">
                <label className="block text-sm font-bold text-text-primary">My microphone</label>
                <p className="text-xs text-text-muted">Which mic to use when you read aloud</p>
              </div>
              <select
                value={prefs.preferredMic ?? ""}
                onChange={(e) => update({ preferredMic: e.target.value || null })}
                className="w-56 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-primary"
              >
                <option value="">System default</option>
                {mics.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>{micLabel(d, i)}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200">
              <Languages className="w-4 h-4 text-accent-primary-dark shrink-0" />
              <div className="flex-1">
                <label className="block text-sm font-bold text-text-primary">Story language</label>
                <p className="text-xs text-text-muted">Language the Story Mode map opens in</p>
              </div>
              <select
                value={prefs.storyLanguage}
                onChange={(e) => update({ storyLanguage: e.target.value as "en" | "ur" })}
                className="w-56 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-primary"
              >
                <option value="en">English</option>
                <option value="ur">اردو (Urdu)</option>
              </select>
            </div>

            <Toggle
              on={prefs.wordTips}
              onChange={(v) => update({ wordTips: v })}
              label="Word help pop-ups"
              hint="Tap a word after a read to see how to say it"
              icon={Lightbulb}
            />
            <Toggle
              on={prefs.biggerText}
              onChange={(v) => update({ biggerText: v })}
              label="Bigger reading text"
              hint="Larger sentences in Story Mode"
              icon={Type}
            />
          </div>
        )}
      </div>

      {/* Password */}
      <div className="speakflow-card bg-white p-6">
        <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center">
          <KeyRound className="w-5 h-5 mr-2 text-text-secondary" /> Change Password
        </h2>
        <div className="space-y-3 max-w-md">
          <input
            type="password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            placeholder="Current password"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-primary"
          />
          <input
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="New password (at least 4 characters)"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-primary"
          />
          <input
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            placeholder="Repeat new password"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent-primary"
          />
          <button
            onClick={handleChangePassword}
            disabled={savingPw}
            className="px-5 py-2.5 rounded-xl bg-text-primary text-white text-sm font-bold hover:bg-gray-800 disabled:opacity-60 inline-flex items-center gap-2"
          >
            {savingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {savingPw ? "Saving…" : "Update Password"}
          </button>
        </div>
      </div>

      {/* Privacy */}
      <div className="speakflow-card bg-white p-6">
        <h2 className="text-lg font-bold text-text-primary mb-2 flex items-center">
          <ShieldCheck className="w-5 h-5 mr-2 text-emerald-500" /> Your Voice & Privacy
        </h2>
        <p className="text-sm text-text-secondary leading-relaxed">
          When you read aloud, your voice is turned into text right away and the recording is
          deleted immediately — it is never saved or shared. Only your scores and which words
          were tricky are kept, so your teacher can help you practice.
        </p>
      </div>
    </div>
  );
}
