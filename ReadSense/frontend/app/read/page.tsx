"use client";

/**
 * Story Mode — the adventure map. Endless dual-track (English / اردو) levels,
 * themed worlds of 5 levels with a boss every fifth level. Progress, stars and
 * unlocks come from the backend (`/api/v1/story/*`) so nothing resets on
 * refresh and the tracks are fully independent.
 *
 * Game feel: framer-motion entrances, pulsing current node, parallax sky,
 * winding dotted path, star ratings under every completed level.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Star, Lock, Check, Play, ChevronLeft, ChevronRight, Loader2, Crown, Sparkles, AudioLines,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchStoryMap, fetchStoryPlay, StoryMap, StoryTrack } from "@/lib/api";
import { loadPrefs, savePrefs } from "@/lib/prefs";
import KidNav from "@/components/auth/KidNav";

const TRACK_LABEL = { en: "English", ur: "اردو" } as const;

function trackGradient(track: StoryTrack, world: number) {
  const en = [
    "from-emerald-200 via-lime-100 to-sky-200",
    "from-sky-200 via-cyan-100 to-blue-200",
    "from-indigo-200 via-violet-100 to-fuchsia-200",
    "from-amber-200 via-orange-100 to-rose-200",
  ];
  const ur = [
    "from-violet-200 via-purple-100 to-fuchsia-200",
    "from-rose-200 via-pink-100 to-amber-200",
    "from-teal-200 via-emerald-100 to-lime-200",
    "from-blue-200 via-indigo-100 to-violet-200",
  ];
  const pool = track === "ur" ? ur : en;
  return pool[(world - 1) % pool.length];
}

/** Winding positions (percentages) for the 5 nodes of a world. */
const NODE_POS = [
  { left: "16%", top: "62%" },
  { left: "38%", top: "42%" },
  { left: "60%", top: "55%" },
  { left: "80%", top: "34%" },
  { left: "50%", top: "18%" },
];

export default function StoryMapPage() {
  const router = useRouter();
  const [track, setTrack] = useState<StoryTrack>("en");
  const [world, setWorld] = useState(0);
  const [map, setMap] = useState<StoryMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = loadPrefs().storyLanguage;
    if (saved === "en" || saved === "ur") setTrack(saved);
  }, []);

  const load = useCallback(async (t: StoryTrack, w?: number) => {
    setLoading(true);
    setError(null);
    try {
      const m = await fetchStoryMap(t, w && w > 0 ? w : undefined);
      setMap(m);
      setWorld(m.world);
    } catch (err: any) {
      setError(err.message || "Could not load the map");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(track, world);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track]);

  const switchTrack = (t: StoryTrack) => {
    if (t === track) return;
    setTrack(t);
    setWorld(0);
    savePrefs({ storyLanguage: t });
  };

  const startLevel = async (level: number, unlocked: boolean) => {
    if (!unlocked || starting) return;
    setStarting(level);
    try {
      await fetchStoryPlay(track, level); // loads + validates the level content
      router.push(`/read/play?track=${track}&level=${level}`);
    } catch (err: any) {
      setError(err.message || "Could not open that level");
      setStarting(null);
    }
  };

  const stars = map?.total_stars ?? 0;
  const isUrdu = track === "ur";

  return (
    <div className="min-h-screen bg-bg-base relative overflow-hidden">
      <KidNav />

      <div className="max-w-3xl mx-auto px-4 pb-16">
        {/* Header */}
        <div className="text-center pt-8 pb-4">
          <motion.h1
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-black text-text-primary flex items-center justify-center gap-2"
          >
            <Sparkles className="w-7 h-7 text-accent-primary-dark" />
            {isUrdu ? "آپ کا سفر" : "Your Journey"}
          </motion.h1>
          <p className="text-sm text-text-secondary mt-1">
            {isUrdu ? "اپنا دنیا چنیں اور پڑھتے چلے جائیں" : "Pick a world and keep reading"}
          </p>
          <motion.div
            key={`stars-${stars}`}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center gap-1.5 mt-3 bg-white border-2 border-amber-200 rounded-full px-4 py-1.5 shadow-sm"
          >
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            <span className="text-lg font-black text-amber-500 font-mono">{stars}</span>
          </motion.div>
        </div>

        {/* Track switcher */}
        <div className="flex justify-center mb-5">
          <div className="inline-flex bg-white border-2 border-gray-100 rounded-full p-1 shadow-sm">
            {(["en", "ur"] as StoryTrack[]).map((t) => (
              <button
                key={t}
                onClick={() => switchTrack(t)}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${
                  track === t ? "bg-accent-primary-dark text-white shadow" : "text-text-secondary hover:text-text-primary"
                } ${t === "ur" ? "font-urdu text-base leading-none" : ""}`}
              >
                {TRACK_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-4 text-center text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl p-3">
            {error}
          </div>
        )}

        {/* World map card */}
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${track}-${world}`}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.25 }}
              className="relative rounded-[32px] border-4 border-white shadow-xl overflow-hidden"
            >
              {/* themed sky */}
              <div className={`absolute inset-0 bg-gradient-to-b ${map ? trackGradient(track, map.world) : "from-sky-200 to-emerald-100"}`} />
              {/* soft light blobs */}
              <div className="absolute -top-10 -left-10 w-48 h-48 bg-white/40 rounded-full blur-2xl animate-pulse" />
              <div className="absolute top-1/3 -right-12 w-64 h-64 bg-white/30 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white/80 to-transparent" />

              {/* world header */}
              <div className="relative z-10 flex items-center justify-center gap-3 pt-6">
                <button
                  onClick={() => setWorld((w) => Math.max(1, w - 1))}
                  disabled={!map || map.world <= 1}
                  className="p-2 rounded-full bg-white/80 shadow disabled:opacity-30"
                >
                  <ChevronLeft className="w-5 h-5 text-text-secondary" />
                </button>
                <div className="text-center">
                  <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-text-muted">
                    {isUrdu ? `دنیا ${map?.world ?? 1}` : `World ${map?.world ?? 1}`}
                  </p>
                  <h2 className={`text-2xl font-black text-text-primary ${isUrdu ? "font-urdu" : ""}`} dir={isUrdu ? "rtl" : "ltr"}>
                    {map?.world_name ?? "…"}
                  </h2>
                </div>
                <button
                  onClick={() => setWorld((w) => w + 1)}
                  disabled={!map || map.world >= Math.ceil((map.unlocked_upto + 1) / 5)}
                  className="p-2 rounded-full bg-white/80 shadow disabled:opacity-30"
                >
                  <ChevronRight className="w-5 h-5 text-text-secondary" />
                </button>
              </div>

              {/* winding path */}
              <svg className="absolute inset-0 w-full h-full z-0" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path
                  d="M 16 66 C 25 50, 32 46, 38 44 S 55 58, 60 57 S 76 40, 80 36 C 70 28, 58 20, 52 20"
                  fill="none" stroke="white" strokeWidth="1.2" strokeDasharray="2.5 2.5" opacity="0.9"
                />
              </svg>

              {/* level nodes */}
              <div className="relative z-10 h-[380px]">
                {loading || !map ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-accent-primary-dark animate-spin" />
                  </div>
                ) : (
                  map.levels.map((lv, i) => {
                    const pos = NODE_POS[i % NODE_POS.length];
                    const playable = lv.unlocked;
                    return (
                      <motion.button
                        key={lv.level}
                        initial={{ opacity: 0, scale: 0.4, y: 24 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: i * 0.09, type: "spring", stiffness: 260, damping: 18 }}
                        whileHover={playable ? { scale: 1.12, rotate: -2 } : {}}
                        whileTap={playable ? { scale: 0.94 } : {}}
                        onClick={() => startLevel(lv.level, playable && lv.status !== "completed")}
                        disabled={!playable || starting === lv.level}
                        className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center focus:outline-none"
                        style={{ left: pos.left, top: pos.top }}
                      >
                        {lv.boss && (
                          <Crown className={`w-6 h-6 mb-0.5 ${lv.status === "completed" ? "text-amber-500 fill-amber-400" : playable ? "text-amber-400" : "text-gray-300"}`} />
                        )}
                        <div
                          className={`relative ${lv.boss ? "w-[72px] h-[72px]" : "w-16 h-16"} rounded-full border-4 flex items-center justify-center shadow-lg transition-shadow ${
                            lv.status === "completed"
                              ? "bg-emerald-400 border-white shadow-emerald-200"
                              : lv.status === "current"
                              ? "bg-accent-primary-dark border-white shadow-[0_0_28px_rgba(140,110,240,0.65)]"
                              : "bg-gray-300/90 border-gray-100"
                          }`}
                        >
                          {lv.status === "completed" ? (
                            <Check className="w-7 h-7 text-white" strokeWidth={3.5} />
                          ) : lv.status === "current" ? (
                            <Play className="w-7 h-7 text-white fill-white" />
                          ) : (
                            <Lock className="w-6 h-6 text-gray-500" />
                          )}
                          <span className="absolute -top-1.5 -right-1 w-6 h-6 rounded-full bg-white border-2 border-gray-100 text-[10px] font-black font-mono text-text-secondary flex items-center justify-center">
                            {lv.level}
                          </span>
                        </div>
                        {/* star row */}
                        <div className="flex gap-0.5 mt-1.5">
                          {[0, 1, 2].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${s < lv.stars ? "fill-amber-400 text-amber-400 drop-shadow" : lv.status === "completed" ? "text-amber-200" : "text-white/70"}`}
                            />
                          ))}
                        </div>
                        {lv.status === "current" && (
                          <motion.span
                            animate={{ scale: [1, 1.08, 1] }}
                            transition={{ repeat: Infinity, duration: 1.4 }}
                            className="mt-1 px-3 py-0.5 rounded-full bg-white text-accent-primary-dark text-[10px] font-black uppercase tracking-wider shadow"
                          >
                            {isUrdu ? "کھیلیں" : "Play"}
                          </motion.span>
                        )}
                      </motion.button>
                    );
                  })
                )}
              </div>

              {/* legend */}
              <div className="relative z-10 flex items-center justify-center gap-5 pb-4 pt-2 text-[10px] font-bold text-text-secondary">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Completed</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent-primary-dark" /> Current</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300" /> Locked</span>
                <span className="flex items-center gap-1"><Crown className="w-3 h-3 text-amber-400" /> Boss</span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* progress line */}
        {map && (
          <p className="text-center text-xs text-text-muted mt-4">
            {isUrdu
              ? `${map.levels_completed} لیول مکمل · ${map.total_stars} ستارے`
              : `${map.levels_completed} level${map.levels_completed === 1 ? "" : "s"} completed · ${map.total_stars} stars earned`}
            {" · "}
            <button onClick={() => load(track, 1)} className="underline hover:text-text-primary">
              {isUrdu ? "شروع سے دیکھیں" : "view from Level 1"}
            </button>
          </p>
        )}

        {/* quick link to the classic dashboard */}
        <div className="flex justify-center mt-6">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-xs font-bold text-text-secondary hover:text-accent-primary-dark inline-flex items-center gap-1.5"
          >
            <AudioLines className="w-4 h-4" /> {isUrdu ? "کلاسک ریڈنگ ڈیش بورڈ" : "Open the Reading Dashboard"}
          </button>
        </div>
      </div>
    </div>
  );
}
