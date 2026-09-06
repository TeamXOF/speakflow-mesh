"use client";

/**
 * Reading Sessions — merged list of BOTH session types:
 *  - v2 Story Mode sessions (real durations from created_at → completed_at)
 *  - Gen-1 live pipeline sessions (no duration is tracked by that pipeline,
 *    shown honestly as "—" rather than a hardcoded fake value)
 * Rows navigate to the dual-mode session detail view (roadmap Phase 12.5).
 */

import { History, Search, Calendar, Filter } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchSessions, fetchV2Sessions, V2SessionListItem } from "@/lib/api";
import { useSpeakFlow } from "@/context/SpeakFlowContext";
import { formatDistanceToNow } from "date-fns";

type Gen1Session = {
  id: string; student_id: string; student_name: string; target_sentence: string | null;
  transcript: string | null; wpm: number | null; accuracy: number | null;
  overall_score: number | null; timestamp: string;
};

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// Gen-1 timestamps are "YYYY-MM-DD HH:MM:SS" — Safari/Firefox reject the space
// form in `new Date`, so normalize to ISO "T" before parsing.
function toTime(when: string): number {
  const t = new Date(when.includes("T") ? when : when.replace(" ", "T")).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export default function SessionsPage() {
  const { addNotification } = useSpeakFlow();
  const router = useRouter();
  const [gen1, setGen1] = useState<Gen1Session[]>([]);
  const [v2, setV2] = useState<V2SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function load() {
      const [g1, g2] = await Promise.allSettled([fetchSessions(), fetchV2Sessions()]);
      if (g1.status === "fulfilled") setGen1(g1.value);
      if (g2.status === "fulfilled") setV2(g2.value);
      if (g1.status === "rejected" && g2.status === "rejected") {
        addNotification({ title: "Error", message: "Failed to load reading sessions", type: "error" });
      }
      setLoading(false);
    }
    load();
  }, [addNotification]);

  const handleFilter = () => {
    addNotification({ title: "Filters", message: "Advanced filtering coming soon", type: "info" });
  };

  // Unified rows, newest first, filtered by search query
  type Row = {
    key: string; id: string; kind: "story" | "live"; student: string;
    when: string; duration: number | null; wpm: number | null;
    accuracy: number | null; score: number | null; label: string;
  };
  const rows: Row[] = [
    ...v2.map((s) => ({
      key: `v2-${s.id}`, id: s.id, kind: "story" as const,
      student: s.student_name || "—",
      when: s.created_at, duration: s.duration_s,
      wpm: null, accuracy: s.avg_accuracy, score: null,
      label: s.story_id.replace("story_", "").replace(/_/g, " "),
    })),
    ...gen1.map((s) => ({
      key: `g1-${s.id}`, id: s.id, kind: "live" as const,
      student: s.student_name, when: s.timestamp,
      duration: null, wpm: s.wpm,
      accuracy: s.accuracy != null ? Math.round(s.accuracy * 100) : null,
      score: s.overall_score,
      label: s.target_sentence || "Live reading",
    })),
  ]
    .sort((a, b) => toTime(b.when) - toTime(a.when))
    .filter((r) =>
      !query ||
      r.student.toLowerCase().includes(query.toLowerCase()) ||
      r.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold font-sans text-text-primary">Reading Sessions</h1>
          <p className="text-sm text-text-secondary mt-1">Story Mode sessions and live pipeline analyses.</p>
        </div>
      </div>

      <div className="speakflow-card bg-white p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-text-muted" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent-primary bg-gray-50"
              placeholder="Search sessions..."
            />
          </div>
          <div className="flex space-x-3">
            <button onClick={handleFilter} className="flex items-center px-4 py-2 border border-gray-200 text-text-secondary text-sm font-medium rounded-lg hover:bg-gray-50">
              <Calendar className="w-4 h-4 mr-2" /> Date
            </button>
            <button onClick={handleFilter} className="flex items-center px-4 py-2 border border-gray-200 text-text-secondary text-sm font-medium rounded-lg hover:bg-gray-50">
              <Filter className="w-4 h-4 mr-2" /> Filter
            </button>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-text-secondary uppercase bg-gray-50 border-y border-gray-200">
              <tr>
                <th className="px-6 py-4 font-bold">Session ID</th>
                <th className="px-6 py-4 font-bold">Type</th>
                <th className="px-6 py-4 font-bold">Student</th>
                <th className="px-6 py-4 font-bold">Date &amp; Time</th>
                <th className="px-6 py-4 font-bold">Duration</th>
                <th className="px-6 py-4 font-bold text-center">WPM</th>
                <th className="px-6 py-4 font-bold text-center">Accuracy</th>
                <th className="px-6 py-4 font-bold text-center">Score</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-text-muted">Loading sessions...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-text-muted">No sessions recorded yet. Start one from the Dashboard or Story Mode.</td></tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.key} onClick={() => router.push(`/sessions/${r.id}`)} className="bg-white border-b hover:bg-gray-50 transition-colors cursor-pointer">
                    <td className="px-6 py-4 font-mono text-text-muted">{r.id.replace(/^sess_/, "").split("-")[0]}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${
                        r.kind === "story" ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700"
                      }`}>
                        {r.kind === "story" ? "Story" : "Live"}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-text-primary">{r.student}</td>
                    <td className="px-6 py-4 text-text-secondary">
                      {formatDistanceToNow(new Date(r.when.includes("T") ? r.when : r.when.replace(" ", "T")))} ago
                      <span className="block text-xs text-text-muted truncate max-w-[220px]">{r.label}</span>
                    </td>
                    <td className="px-6 py-4 text-text-secondary font-mono">{formatDuration(r.duration)}</td>
                    <td className="px-6 py-4 text-center font-mono font-bold">{r.wpm ? Math.round(r.wpm) : "—"}</td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-status-good">{r.accuracy != null ? `${r.accuracy}%` : "—"}</td>
                    <td className="px-6 py-4 text-center">
                      {r.score != null ? (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          r.score > 85 ? "bg-green-100 text-green-700" :
                          r.score > 70 ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                        }`}>
                          {r.score}/100
                        </span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
