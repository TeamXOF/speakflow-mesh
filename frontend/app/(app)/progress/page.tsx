"use client";

/**
 * Progress Tracker — real class-wide data: weekly accuracy chart, per-checkpoint
 * progress across every story, and a per-student summary table. No mock stats.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, TrendingUp, ListChecks, Users } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { fetchClassroomOverview, fetchRoster, ClassroomOverview, RosterEntry } from "@/lib/api";
import { useSpeakFlow } from "@/context/SpeakFlowContext";
import { useAuth } from "@/components/auth/AuthProvider";

export default function ProgressPage() {
  const { addNotification } = useSpeakFlow();
  const { user, isTeacher } = useAuth();
  const router = useRouter();
  const [overview, setOverview] = useState<ClassroomOverview | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isTeacher) { setLoading(false); return; }  // teacher-only data
    (async () => {
      try {
        setOverview(await fetchClassroomOverview());
      } catch (err: any) {
        addNotification({ title: "Error", message: err.message || "Failed to load class data", type: "error" });
      }
      try {
        setRoster(await fetchRoster());
      } catch { /* teacher-only; students see class charts only */ }
      setLoading(false);
    })();
  }, [addNotification]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent-primary-dark animate-spin" />
      </div>
    );
  }

  const weekly = overview?.weekly || [];
  const avgAccuracy = overview?.totals.class_accuracy;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-sans text-text-primary">Progress Tracker</h1>
          <p className="text-sm text-text-secondary mt-1">Real class-wide trends from Story Mode sessions.</p>
        </div>
        {avgAccuracy != null && (
          <div className="text-right">
            <p className="text-3xl font-extrabold text-text-primary font-mono">{avgAccuracy}%</p>
            <p className="text-xs font-mono uppercase tracking-wider text-text-muted flex items-center justify-end gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-status-complete" /> class accuracy
            </p>
          </div>
        )}
      </div>

      {/* Weekly class performance */}
      <div className="speakflow-card bg-white p-6">
        <h2 className="text-lg font-bold text-text-primary mb-4">Class Performance Over Time</h2>
        {weekly.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekly} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="day" axisLine={false} tickLine={false} dy={10}
                  tick={{ fill: "#9CA3AF", fontSize: 11, fontFamily: "monospace" }}
                  tickFormatter={(d: string) => d.slice(5)}
                />
                <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fill: "#9CA3AF", fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                <Line type="monotone" dataKey="accuracy" stroke="var(--accent-primary-dark)" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-text-muted py-8 text-center">No checkpoint data yet — run Story Mode sessions first.</p>
        )}
      </div>

      {/* Per-checkpoint class progress */}
      <div className="speakflow-card bg-white p-6">
        <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center">
          <ListChecks className="w-5 h-5 mr-2 text-text-muted" />
          Checkpoint Progress by Story
        </h2>
        {(overview?.checkpoint_progress?.length || 0) === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">Nothing to show yet.</p>
        ) : (
          <div className="space-y-6">
            {[...(overview!.checkpoint_progress.reduce((groups, cp) => {
              const list = groups.get(cp.story_id) || [];
              list.push(cp);
              groups.set(cp.story_id, list);
              return groups;
            }, new Map<string, ClassroomOverview["checkpoint_progress"]>())).entries()].map(([storyId, cps]) => (
              <div key={storyId}>
                <p className="text-sm font-extrabold text-text-primary mb-2">{cps[0].story_emoji} {cps[0].story_title}</p>
                <div className="space-y-2">
                  {cps.map((cp, i) => (
                    <div key={cp.checkpoint_id} className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-xl">
                      <span className="text-xs font-mono text-text-muted w-5">{i + 1}.</span>
                      <span className="flex-1 text-sm text-text-primary truncate">{cp.checkpoint_label}…</span>
                      <div className="w-28 h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${cp.avg_accuracy >= 85 ? "bg-status-complete" : cp.avg_accuracy >= 70 ? "bg-accent-primary-dark" : "bg-status-anxious"}`}
                          style={{ width: `${cp.avg_accuracy}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold font-mono w-12 text-right ${cp.avg_accuracy >= 85 ? "text-status-complete" : cp.avg_accuracy >= 70 ? "text-accent-primary-dark" : "text-status-anxious"}`}>
                        {cp.attempted > 0 ? `${cp.avg_accuracy}%` : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Per-student table (teacher only) */}
      {roster.length > 0 && (
        <div className="speakflow-card bg-white p-6">
          <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-text-muted" />
            Per-Student Summary
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-text-secondary uppercase bg-gray-50 border-y border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-bold">Student</th>
                  <th className="px-4 py-3 font-bold text-center">Checkpoints</th>
                  <th className="px-4 py-3 font-bold text-center">Avg Accuracy</th>
                  <th className="px-4 py-3 font-bold text-center">Stars</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => {
                      if (user?.role === "teacher") router.push(`/students/${s.id}`);
                    }}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-bold text-text-primary">{s.name}</td>
                    <td className="px-4 py-3 text-center font-mono">{s.checkpoints_passed}/{s.checkpoints_attempted}</td>
                    <td className="px-4 py-3 text-center font-mono">{s.avg_accuracy != null ? `${s.avg_accuracy}%` : "—"}</td>
                    <td className="px-4 py-3 text-center font-mono text-amber-500">{s.stars}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-text-muted mt-3 text-center">
            Click a student for their full drill-down{" "}
            <Link href="/students" className="text-accent-primary-dark font-bold hover:underline">or open the roster</Link>.
          </p>
        </div>
      )}
    </div>
  );
}
