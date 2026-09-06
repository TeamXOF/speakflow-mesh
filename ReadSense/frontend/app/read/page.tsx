"use client";

/**
 * Story Mode — Story Map / Chapter Select (UI guide: Student Experience S1).
 * Fullscreen kid-facing adventure map: illustrated scene with numbered chapter
 * stops (completed ✓ / in-progress / locked), legend, and a stars badge.
 * Students are bound to their own account; teachers pick any reader.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Sparkles, Star, Loader2 } from "lucide-react";
import { fetchStudents, fetchStories, StorySummary } from "@/lib/api";
import { useSpeakFlowSession } from "@/context/SpeakFlowSessionContext";
import { useAuth } from "@/components/auth/AuthProvider";
import KidNav from "@/components/auth/KidNav";
import { loadPrefs, savePrefs } from "@/lib/prefs";

export default function StoryMapPage() {
  const router = useRouter();
  const { user, isTeacher } = useAuth();
  const { reader, setReader, startNewSession, language, setLanguage } = useSpeakFlowSession();
  const changeLanguage = (l: "en" | "ur") => { setLanguage(l); savePrefs({ storyLanguage: l }); };
  const [students, setStudents] = useState<{ id: string; name: string; grade: number }[]>([]);
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);

  // Students always read as themselves; teachers pick any reader
  const effectiveReader = isTeacher
    ? reader
    : user?.student_id
    ? { id: user.student_id, name: user.name, grade: "" }
    : null;

  useEffect(() => {
    // Open the map in the student's saved story language (Settings → Reading Preferences)
    const saved = loadPrefs().storyLanguage;
    if (saved && saved !== language) setLanguage(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const readerId = isTeacher ? reader?.id : user?.student_id || undefined;
    (async () => {
      try {
        const [st, sr] = await Promise.all([
          isTeacher ? fetchStudents() : Promise.resolve([]),
          fetchStories(readerId),
        ]);
        setStudents(st);
        setStories(sr);
      } catch {
        setStories([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [reader?.id, isTeacher, user?.student_id]);

  const startStory = async (story: StorySummary) => {
    if (story.locked || starting) return;
    const active = effectiveReader;
    if (!active) {
      alert(
        "Your account isn't linked to a reader profile yet — ask your teacher to approve it, then try again."
      );
      return;
    }
    setStarting(story.id);
    const sid = await startNewSession(active.id, story.id, language);
    setStarting(null);
    if (sid) router.push(`/read/${sid}`);
  };

  const totalStars = stories.reduce((sum, s) => sum + s.passed_checkpoints * 10, 0);

  // Map geometry per chapter node
  const nodes = [
    { x: 130, y: 250 },
    { x: 320, y: 150 },
    { x: 500, y: 235 },
  ];
  const statusStyle = (s: StorySummary) =>
    s.status === "completed"
      ? { fill: "#22C55E", ring: "#86EFAC" }
      : s.status === "in_progress"
      ? { fill: "#A89EDB", ring: "#C9BFF0" }
      : { fill: "#D1D5DB", ring: "#E5E7EB" };

  return (
    <div className="min-h-screen bg-bg-base relative overflow-hidden">
      <KidNav />

      {/* Stars badge */}
      <div className="absolute top-[74px] right-5 z-10 flex items-center gap-2 bg-white border-2 border-amber-200 rounded-full px-4 py-2 shadow-sm">
        <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
        <span className="text-lg font-extrabold text-amber-500 font-mono">{totalStars}</span>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-extrabold text-text-primary flex items-center justify-center gap-3">
            <Sparkles className="w-8 h-8 text-accent-primary" />
            Your Journey
          </h1>
          <p className="text-text-secondary mt-1">
            {isTeacher ? "Choose a chapter for your reader to continue" : "Choose a chapter to continue"}
          </p>
        </div>

        {/* Teacher: reader picker (students are bound to their own account) */}
        {isTeacher && (
          <div className="speakflow-card p-4 mb-5">
            <p className="text-xs font-mono font-bold uppercase tracking-wider text-text-muted mb-2">
              Who is reading today?
            </p>
            <div className="flex flex-wrap gap-2">
              {students.map((s) => {
                const active = reader?.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setReader({ id: s.id, name: s.name, grade: s.grade })}
                    className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border-2 transition-all ${
                      active
                        ? "border-accent-primary-dark bg-accent-primary-bg"
                        : "border-gray-200 bg-white hover:border-accent-primary"
                    }`}
                  >
                    <span className={`h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${active ? "bg-accent-primary-dark" : "bg-gray-300"}`}>
                      {s.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                    </span>
                    <span className={`text-xs font-bold ${active ? "text-accent-primary-dark" : "text-text-primary"}`}>
                      {s.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Language */}
        <div className="flex justify-center gap-2 mb-5">
          <button
            onClick={() => changeLanguage("en")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
              language === "en"
                ? "border-accent-primary-dark bg-accent-primary-bg text-accent-primary-dark"
                : "border-gray-200 text-text-secondary hover:border-accent-primary"
            }`}
          >
            English
          </button>
          <button
            onClick={() => changeLanguage("ur")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold border-2 transition-all font-urdu ${
              language === "ur"
                ? "border-accent-primary-dark bg-accent-primary-bg text-accent-primary-dark"
                : "border-gray-200 text-text-secondary hover:border-accent-primary"
            }`}
          >
            اردو
          </button>
        </div>

        {/* Adventure map */}
        <div className="speakflow-card rounded-[28px] overflow-hidden shadow-lg">
          {loading ? (
            <div className="h-[360px] flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-accent-primary-dark animate-spin" />
            </div>
          ) : (
            <svg viewBox="0 0 640 380" className="w-full h-auto block">
              {/* Sky */}
              <defs>
                <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#DDEBFF" />
                  <stop offset="100%" stopColor="#FDF6EC" />
                </linearGradient>
              </defs>
              <rect width="640" height="380" fill="url(#sky)" />
              {/* Sun + clouds */}
              <circle cx="575" cy="55" r="26" fill="#FFE28A" />
              <circle cx="575" cy="55" r="36" fill="#FFE28A" opacity="0.35" />
              <g fill="#FFFFFF" opacity="0.85">
                <ellipse cx="110" cy="60" rx="34" ry="14" />
                <ellipse cx="140" cy="52" rx="24" ry="12" />
                <ellipse cx="440" cy="42" rx="28" ry="11" />
              </g>
              {/* Hills */}
              <ellipse cx="90" cy="360" rx="230" ry="90" fill="#B7E4C7" />
              <ellipse cx="480" cy="380" rx="260" ry="100" fill="#95D5B2" />
              <ellipse cx="300" cy="395" rx="220" ry="80" fill="#74C69D" opacity="0.9" />
              {/* Little trees */}
              <g>
                <circle cx="70" cy="300" r="16" fill="#52B788" />
                <rect x="67" y="310" width="6" height="12" fill="#8D6E63" />
                <circle cx="580" cy="315" r="18" fill="#52B788" />
                <rect x="577" y="327" width="6" height="13" fill="#8D6E63" />
                <circle cx="228" cy="345" r="14" fill="#52B788" />
                <rect x="225" y="354" width="6" height="11" fill="#8D6E63" />
              </g>
              {/* Winding dotted path */}
              <path
                d={`M ${nodes[0].x} ${nodes[0].y} C ${nodes[0].x + 60} ${nodes[0].y - 70}, ${nodes[1].x - 70} ${nodes[1].y + 60}, ${nodes[1].x} ${nodes[1].y} S ${nodes[2].x - 70} ${nodes[2].y + 70}, ${nodes[2].x} ${nodes[2].y}`}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="5"
                strokeDasharray="2 14"
                strokeLinecap="round"
              />

              {/* Chapter nodes */}
              {stories.slice(0, 3).map((story, i) => {
                const pos = nodes[i] || nodes[2];
                const style = statusStyle(story);
                const locked = story.locked;
                const isCurrent = story.status === "in_progress" || (i === 0 && story.status === "available");
                return (
                  <g
                    key={story.id}
                    onClick={() => startStory(story)}
                    style={{ cursor: locked ? "not-allowed" : "pointer" }}
                  >
                    <title>{story.title} — {story.passed_checkpoints}/{story.total_checkpoints}</title>
                    {/* glow ring for current chapter */}
                    {isCurrent && !locked && (
                      <circle cx={pos.x} cy={pos.y} r="34" fill="none" stroke={style.ring} strokeWidth="3" opacity="0.7">
                        <animate attributeName="r" values="30;40;30" dur="2.2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2.2s" repeatCount="indefinite" />
                      </circle>
                    )}
                    <circle cx={pos.x} cy={pos.y} r="26" fill={locked ? "#F3F4F6" : "#FFFFFF"} stroke={locked ? "#D1D5DB" : style.fill} strokeWidth="4" />
                    {locked ? (
                      <text x={pos.x} y={pos.y + 8} textAnchor="middle" fontSize="20">🔒</text>
                    ) : story.status === "completed" ? (
                      <>
                        <text x={pos.x} y={pos.y + 9} textAnchor="middle" fontSize="24" fontWeight="800" fill={style.fill}>
                          {i + 1}
                        </text>
                        <circle cx={pos.x + 20} cy={pos.y - 18} r="11" fill="#22C55E" stroke="#FFFFFF" strokeWidth="2.5" />
                        <path d={`M ${pos.x + 15.5} ${pos.y - 18} l 3.5 3.5 l 6 -7`} stroke="#FFF" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                      </>
                    ) : (
                      <text x={pos.x} y={pos.y + 9} textAnchor="middle" fontSize="24" fontWeight="800" fill={style.fill}>
                        {i + 1}
                      </text>
                    )}
                    {/* Label */}
                    <text
                      x={pos.x}
                      y={pos.y + 52}
                      textAnchor="middle"
                      fontSize="13"
                      fontWeight="700"
                      fill="#484848"
                    >
                      {language === "ur" ? story.title_ur : story.title}
                    </text>
                    <text x={pos.x} y={pos.y + 70} textAnchor="middle" fontSize="11" fill="#6B7280" fontFamily="monospace">
                      {story.passed_checkpoints}/{story.total_checkpoints}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 py-4 border-t border-gray-100 bg-white">
            <span className="flex items-center gap-1.5 text-xs font-bold text-text-secondary">
              <span className="h-3 w-3 rounded-full bg-status-complete" /> Completed
            </span>
            <span className="flex items-center gap-1.5 text-xs font-bold text-text-secondary">
              <span className="h-3 w-3 rounded-full bg-accent-primary-dark" /> In Progress
            </span>
            <span className="flex items-center gap-1.5 text-xs font-bold text-text-secondary">
              <span className="h-3 w-3 rounded-full bg-gray-300" /> Locked
            </span>
          </div>
        </div>

        {/* Start CTA hint */}
        {!loading && stories.length > 0 && (
          <p className="text-center text-sm text-text-secondary mt-5 flex items-center justify-center gap-2">
            <Play className="w-4 h-4 text-accent-primary-dark" />
            Tap a chapter on the map to begin reading!
          </p>
        )}
        {!loading && isTeacher && students.length === 0 && (
          <p className="text-center text-sm text-text-muted mt-5">
            No students in the roster yet — approve student accounts in Settings.
          </p>
        )}
      </div>
    </div>
  );
}
