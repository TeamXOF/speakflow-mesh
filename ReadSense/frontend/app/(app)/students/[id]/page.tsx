"use client";

/**
 * Teacher Hub — Student Progress (UI guide: Teacher Experience, panel 2).
 * Individual diagnostics: trend, struggling words, story progress,
 * recent sessions + the static parent WhatsApp example (roadmap UI Prompt 8:
 * preview only — no live send is implied or implemented).
 */

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Star, TrendingUp, MessageCircle, BookOpen, Target, Loader2,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  fetchStudentDashboard, fetchParentMessage, toggleParentUpdates,
  ParentUpdate, StudentDashboard,
} from "@/lib/api";
import { prettyPhoneme } from "@/lib/phonemes";
import { useAuth } from "@/components/auth/AuthProvider";

export default function StudentProgressPage() {
  const params = useParams();
  const studentId = typeof params.id === "string" ? params.id : (params.id as string[])?.[0];
  const { isTeacher, user } = useAuth();
  const [data, setData] = useState<StudentDashboard | null>(null);
  const [parentUpdate, setParentUpdate] = useState<ParentUpdate | null>(null);
  const [toggling, setToggling] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadParentUpdate = useCallback(async () => {
    if (!studentId) return;
    try {
      setParentUpdate(await fetchParentMessage(studentId));
    } catch {
      setParentUpdate(null);
    }
  }, [studentId]);

  useEffect(() => {
    if (!studentId) return;
    (async () => {
      try {
        setData(await fetchStudentDashboard(studentId));
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
    loadParentUpdate();
  }, [studentId, loadParentUpdate]);

  const handleParentToggle = async () => {
    if (!parentUpdate) return;
    setToggling(true);
    try {
      await toggleParentUpdates(studentId, !parentUpdate.enabled);
      await loadParentUpdate();
    } catch {
      /* notification surfaces via reload failure silently; keep simple */
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return <div className="max-w-6xl mx-auto py-20 text-center text-text-muted">Loading student progress...</div>;
  }
  if (!data) {
    return (
      <div className="max-w-6xl mx-auto py-20 text-center">
        <p className="text-text-muted mb-4">Could not load this student.</p>
        <Link href={isTeacher ? "/students" : "/dashboard"} className="text-sm font-bold text-accent-primary-dark hover:underline">← Go back</Link>
      </div>
    );
  }

  const { student, summary, trend, struggling_words, phoneme_errors, stories, recent_sessions } = data;
  const initials = student.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const stats = [
    { label: "Checkpoints", value: `${summary.checkpoints_passed}/${summary.checkpoints_attempted || 0}`, icon: BookOpen, color: "text-violet-500" },
    { label: "Avg Accuracy", value: summary.avg_accuracy != null ? `${summary.avg_accuracy}%` : "--", icon: Target, color: "text-emerald-500" },
    { label: "Reading Score", value: summary.recent_score != null ? `${summary.recent_score}` : "--", icon: TrendingUp, color: "text-sky-500" },
    { label: "Stars", value: `${summary.stars}`, icon: Star, color: "text-amber-500" },
  ];
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href={isTeacher ? "/students" : "/dashboard"} className="p-2 rounded-full bg-white border border-gray-200 text-text-secondary hover:text-text-primary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="text-xs font-mono uppercase tracking-wider text-text-muted">
          {isTeacher ? "Full student view" : "My progress"} · Last {trend.length} active days
        </span>
      </div>

      <div className="speakflow-card bg-white p-6">
        <div className="flex items-center gap-4">
          <span className="h-14 w-14 rounded-full bg-accent-primary-bg border-2 border-accent-primary-dark/30 flex items-center justify-center text-lg font-extrabold text-accent-primary-dark">
            {initials}
          </span>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold text-text-primary">{student.name}</h1>
            <p className="text-sm text-text-secondary">Grade {student.grade} · {student.level}</p>
          </div>
          {/* Progress bar */}
          <div className="w-48">
            <p className="text-xs font-mono uppercase tracking-wider text-text-muted mb-1 text-right">Overall progress</p>
            <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-accent-primary-dark" style={{ width: `${summary.progress_pct}%` }} />
            </div>
            <p className="text-xs text-text-muted text-right mt-1">{summary.progress_pct}%</p>
          </div>
        </div>

        {/* Stat row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-bg-base rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className={`w-4 h-4 ${s.color}`} />
                  <span className="text-xs font-mono uppercase tracking-wider text-text-muted">{s.label}</span>
                </div>
                <p className="text-2xl font-extrabold text-text-primary">{s.value}</p>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-text-muted mt-3">
          {summary.classic_sessions > 0
            ? `Includes ${summary.classic_sessions} classic-engine read${summary.classic_sessions === 1 ? "" : "s"} and ${summary.story_sessions} story checkpoint${summary.story_sessions === 1 ? "" : "s"}.`
            : "Counts include classic-engine reads and story checkpoints."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progress over time */}
        <div className="speakflow-card bg-white p-6">
          <h2 className="text-lg font-bold text-text-primary mb-4">Progress Over Time</h2>
          {trend.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="date" axisLine={false} tickLine={false} dy={10}
                    tick={{ fill: "#9CA3AF", fontSize: 11, fontFamily: "monospace" }}
                    tickFormatter={(d: string) => d.slice(5)}
                  />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fill: "#9CA3AF", fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="accuracy" name="Accuracy %" stroke="var(--status-good)" strokeWidth={3} dot={{ r: 4 }} />
                  <Line yAxisId="right" type="monotone" dataKey="wpm" name="WPM" stroke="var(--accent-primary-dark)" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-sm text-text-muted">
              No story checkpoints yet for this student.
            </div>
          )}
        </div>

        {/* Struggling words */}
        <div className="speakflow-card bg-white p-6">
          <h2 className="text-lg font-bold text-text-primary mb-1">Struggling Words</h2>
          <p className="text-xs text-text-secondary mb-4">
            {isTeacher ? "Words this student has missed in their reads" : "Words you found tricky in your reads"}
          </p>
          {struggling_words.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-6">
              {struggling_words.map((w) => (
                <span key={w.word} className="px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200 text-orange-600 text-sm font-bold">
                  {w.word} <span className="text-xs opacity-70">×{w.count}</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted mb-6">No repeated struggles — nice!</p>
          )}

          {phoneme_errors.length > 0 && (
            <>
              <h3 className="text-sm font-bold text-text-primary mb-2">Sound patterns behind them</h3>
              <div className="flex flex-wrap gap-2">
                {phoneme_errors.map((p) => (
                  <span key={p.phoneme} className="px-3 py-1.5 rounded-full bg-accent-primary-bg border border-accent-primary/30 text-accent-primary-dark text-sm font-bold">
                    {prettyPhoneme(p.phoneme)} <span className="text-xs opacity-70">×{p.count}</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Story progress */}
        <div className="speakflow-card bg-white p-6">
          <h2 className="text-lg font-bold text-text-primary mb-4">Story Progress</h2>
          <div className="space-y-3">
            {stories.map((s) => (
              <div key={s.story_id} className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
                <span className="text-2xl">{s.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-text-primary">{s.title}</p>
                  <div className="h-2 rounded-full bg-gray-200 overflow-hidden mt-1.5">
                    <div className="h-full rounded-full bg-status-complete" style={{ width: `${(s.passed / Math.max(s.total, 1)) * 100}%` }} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-text-primary">{s.passed}/{s.total}</p>
                  <p className="text-xs text-amber-500 font-bold flex items-center gap-1 justify-end">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />{s.stars}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Parent update — generated live from this student's real data */}
        <div className="speakflow-card bg-white p-6">
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-lg font-bold text-text-primary flex items-center">
              <MessageCircle className="w-5 h-5 mr-2 text-green-500" />
              Parent Update
            </h2>
            {isTeacher && parentUpdate && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-text-secondary">Auto-update</span>
                <button
                  onClick={handleParentToggle}
                  disabled={toggling}
                  title={parentUpdate.enabled ? "Automatic parent updates are ON — click to disable" : "OFF — click to enable"}
                  className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${parentUpdate.enabled ? "bg-status-complete" : "bg-gray-300"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${parentUpdate.enabled ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-text-secondary mb-4">
            {parentUpdate?.enabled
              ? "Auto-updates ON — this message is generated from real session data. Preview only, nothing is sent."
              : "Auto-updates are OFF for this student."}
          </p>

          {!parentUpdate ? (
            <div className="flex items-center gap-2 text-sm text-text-muted py-3">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading update…
            </div>
          ) : parentUpdate.enabled && parentUpdate.message ? (
            <div dir="rtl" className="bg-[#DCF8C6] rounded-2xl rounded-tr-sm p-4 max-w-[95%] ml-auto shadow-sm border border-green-100">
              <p className="font-urdu text-sm text-gray-800 leading-relaxed">{parentUpdate.message}</p>
              <p className="text-[10px] text-gray-500 text-left mt-2" dir="ltr">WhatsApp · preview only</p>
            </div>
          ) : (
            <div className="text-sm text-text-muted italic py-3">
              Automatic parent updates are disabled{isTeacher ? " — use the toggle above to enable them." : "."}
            </div>
          )}
        </div>
      </div>

      {/* Recent reads — both engines */}
      <div className="speakflow-card bg-white p-6">
        <h2 className="text-lg font-bold text-text-primary mb-4">Recent Reads</h2>
        {recent_sessions.length > 0 ? (
          <div className="space-y-2">
            {recent_sessions.map((s) => (
              <Link
                key={`${s.kind}-${s.id}`}
                href={`/sessions/${s.id}`}
                className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl hover:bg-accent-primary-bg transition-colors cursor-pointer"
              >
                <span
                  className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                    s.kind === "story"
                      ? "bg-accent-primary-bg text-accent-primary-dark"
                      : "bg-orange-50 text-orange-500 border border-orange-200"
                  }`}
                >
                  {s.kind === "story" ? "Story" : "Classic"}
                </span>
                <span className="text-xs font-mono text-text-muted w-20 shrink-0">{s.created_at?.slice(0, 10)}</span>
                <span className="flex-1 text-sm font-bold text-text-primary truncate">{s.label}</span>
                <span className="text-xs font-mono text-text-muted uppercase hidden sm:inline">
                  {s.language === "ur" ? "اردو" : s.language}
                </span>
                <span className="text-sm font-bold font-mono text-text-primary">
                  {s.avg_accuracy != null ? `${Math.round(s.avg_accuracy)}%` : "--"}
                </span>
                {s.kind === "story" && (
                  <span className="text-xs text-amber-500 font-bold flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />{s.stars ?? 0}
                  </span>
                )}
                {s.kind === "classic" && s.wpm != null && (
                  <span className="text-xs font-mono text-text-muted hidden sm:inline">{Math.round(s.wpm)} WPM</span>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted">No reads yet — start from the Dashboard or Story Mode.</p>
        )}
      </div>
    </div>
  );
}
