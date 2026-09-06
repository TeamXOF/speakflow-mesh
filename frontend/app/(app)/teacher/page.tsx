"use client";

/**
 * Teacher Hub — Overview Dashboard (UI guide: Teacher Experience, panel 1).
 * Class-wide health: totals, weekly performance, struggling areas,
 * and a per-checkpoint overview across all stories.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users, CalendarCheck, Target, Star, TrendingUp, AlertCircle, ListChecks,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { fetchClassroomOverview, ClassroomOverview } from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function TeacherOverviewPage() {
  const { isTeacher } = useAuth();
  const [data, setData] = useState<ClassroomOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (isTeacher) setData(await fetchClassroomOverview());
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = [
    {
      label: "Active Students", value: data?.totals.active_students ?? "--",
      icon: Users, color: "text-violet-500", bg: "bg-violet-100",
    },
    {
      label: "Sessions Today", value: data?.totals.sessions_today ?? "--",
      icon: CalendarCheck, color: "text-sky-500", bg: "bg-sky-100",
    },
    {
      label: "Class Accuracy", value: data?.totals.class_accuracy != null ? `${data.totals.class_accuracy}%` : "--",
      icon: Target, color: "text-emerald-500", bg: "bg-emerald-100",
    },
    {
      label: "Stars Awarded", value: data?.totals.stars_awarded ?? "--",
      icon: Star, color: "text-amber-500", bg: "bg-amber-100",
    },
  ];

  // Group checkpoint progress by story for the overview table
  const storyGroups = new Map<string, ClassroomOverview["checkpoint_progress"]>();
  (data?.checkpoint_progress || []).forEach((cp) => {
    const list = storyGroups.get(cp.story_id) || [];
    list.push(cp);
    storyGroups.set(cp.story_id, list);
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between mb-2">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary">{greeting()}, Teacher!</h1>
          <p className="text-sm text-text-secondary mt-1">
            Here&apos;s what&apos;s happening today ·{" "}
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="speakflow-card bg-white p-5">
              <div className={`inline-flex p-2.5 rounded-xl ${s.bg} mb-3`}>
                <Icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className="text-3xl font-extrabold text-text-primary">{s.value}</p>
              <p className="text-xs font-mono uppercase tracking-wider text-text-muted mt-1">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class performance */}
        <div className="speakflow-card bg-white p-6">
          <h2 className="text-lg font-bold text-text-primary flex items-center mb-1">
            <TrendingUp className="w-5 h-5 mr-2 text-text-muted" />
            Class Performance
          </h2>
          <p className="text-xs text-text-secondary mb-4">Average checkpoint accuracy, last 7 active days</p>
          <div className="h-64">
            {(data?.weekly?.length || 0) > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data!.weekly} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="day"
                    axisLine={false} tickLine={false} dy={10}
                    tick={{ fill: "#9CA3AF", fontSize: 11, fontFamily: "monospace" }}
                    tickFormatter={(d: string) => d.slice(5)}
                  />
                  <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fill: "#9CA3AF", fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                  <Line type="monotone" dataKey="accuracy" stroke="var(--accent-primary-dark)" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-text-muted">
                No checkpoint data yet — run a Story Mode session to see class trends.
              </div>
            )}
          </div>
        </div>

        {/* Top struggling areas */}
        <div className="speakflow-card bg-white p-6">
          <h2 className="text-lg font-bold text-text-primary flex items-center mb-1">
            <AlertCircle className="w-5 h-5 mr-2 text-text-muted" />
            Top Struggling Areas
          </h2>
          <p className="text-xs text-text-secondary mb-4">Where the class needs the most support</p>
          {(data?.struggling_areas?.length || 0) > 0 ? (
            <div className="space-y-3">
              {data!.struggling_areas.map((a, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-bold text-text-primary">{a.label}</span>
                    <span className="font-mono text-text-secondary">{a.rate}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${i === 0 ? "bg-status-needs" : i === 1 ? "bg-status-anxious" : "bg-accent-primary-dark"}`}
                      style={{ width: `${Math.min(100, a.rate * 2)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-text-muted">
              Nothing flagged yet — great news so far.
            </div>
          )}
        </div>
      </div>

      {/* Checkpoint overview */}
      <div className="speakflow-card bg-white p-6">
        <h2 className="text-lg font-bold text-text-primary flex items-center mb-1">
          <ListChecks className="w-5 h-5 mr-2 text-text-muted" />
          Checkpoint Overview
        </h2>
        <p className="text-xs text-text-secondary mb-4">Class-wide progress across every story checkpoint</p>

        {loading ? (
          <div className="h-24 bg-gray-50 rounded-xl animate-pulse" />
        ) : storyGroups.size === 0 ? (
          <div className="text-sm text-text-muted py-6 text-center">
            No story sessions yet. Checkpoints appear here as students play Story Mode.
          </div>
        ) : (
          <div className="space-y-6">
            {[...storyGroups.entries()].map(([storyId, cps]) => (
              <div key={storyId}>
                <p className="text-sm font-extrabold text-text-primary mb-2">
                  {cps[0].story_emoji} {cps[0].story_title}
                </p>
                <div className="space-y-2">
                  {cps.map((cp, i) => (
                    <div key={cp.checkpoint_id} className="flex items-center gap-4 px-4 py-2.5 bg-gray-50 rounded-xl">
                      <span className="text-xs font-mono text-text-muted w-5">{i + 1}.</span>
                      <span className="flex-1 text-sm text-text-primary truncate">{cp.checkpoint_label}…</span>
                      <span className={`text-xs font-bold font-mono ${cp.avg_accuracy >= 85 ? "text-status-complete" : cp.avg_accuracy >= 70 ? "text-accent-primary-dark" : "text-status-anxious"}`}>
                        {cp.attempted > 0 ? `${cp.avg_accuracy}%` : "—"}
                      </span>
                      <span className="text-xs text-text-muted font-mono w-16 text-right">
                        {cp.passed}/{cp.attempted} passed
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Per-sound error heatmap (roadmap Phase 12.4) */}
      <div className="speakflow-card bg-white p-6">
        <h2 className="text-lg font-bold text-text-primary flex items-center mb-1">
          <Target className="w-5 h-5 mr-2 text-text-muted" />
          Per-Sound Error Heatmap
        </h2>
        <p className="text-xs text-text-secondary mb-4">
          Error rate per sound across {data?.words_analyzed ?? 0} analyzed words — deeper red = more frequent struggle
        </p>
        {(data?.phoneme_heatmap?.length || 0) > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
            {data!.phoneme_heatmap.map((h) => {
              const intensity = Math.min(1, h.rate / 8); // 8%+ of all words = full depth
              return (
                <div
                  key={h.phoneme}
                  title={`${h.count} errors across the class`}
                  className="rounded-xl border border-gray-200 p-3 text-center"
                  style={{ backgroundColor: `rgba(248, 113, 113, ${0.08 + intensity * 0.55})` }}
                >
                  <p className="text-xs font-mono font-bold text-text-primary truncate" dir="auto">
                    {h.phoneme}
                  </p>
                  <p className="text-sm font-extrabold text-text-primary mt-1">{h.rate}%</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-text-muted py-4 text-center">
            No sound errors recorded yet — run a few Story Mode sessions.
          </div>
        )}
      </div>

      {/* Link out to per-student views */}
      <div className="text-center">
        <Link href="/students" className="text-sm font-bold text-accent-primary-dark hover:underline">
          Dive into a student&apos;s individual progress →
        </Link>
      </div>
    </div>
  );
}
