# SpeakFlow — Build-Facing Technical Explanation

**Revision note:** Alibaba Cloud Model Studio (Qwen AI) access was not provided to the team and there is no budget to pay for it. Qwen is removed from the architecture below. Google AI Studio's Gemini 3.5 Flash-Lite (free tier, multimodal including audio) takes over the LLM-layer jobs Qwen previously had. See the chat response for the scoring consequences of this — it is real and not fully recoverable by a vendor swap alone.

**Status legend**
- **BUILT** — core, non-negotiable scope; must be verified working before the pitch.
- **TO BUILD** — planned scope for Day 1–2; standard build risk.
- **ROADMAP-ONLY** — not attempted in the 3-day build; mentioned only as future vision, never demoed.

---

## 1. Acoustic Phonetic Analysis Engine
**What it does:** Extracts raw acoustic features — pitch, formant frequencies, zero-crossing rate, spectral energy — directly from a student's audio, and compares them against reference phoneme targets to catch mispronunciations a transcript alone would miss.

**Implementation:** Python + librosa, running locally in the backend process (unchanged from the original stack). Reference targets come from the phoneme dictionary in Feature 2.

**Why this tech:** librosa is the one piece of the stack that produces genuine acoustic evidence — it's what makes SpeakFlow more than "Whisper with a UI," and every other decision in this doc is made to protect that fact.

**Status:** TO BUILD (Day 1 — must be measured and working before anything else is scheduled).

---

## 2. Dual-Language Engine (English + Urdu Qaida)
**What it does:** Provides reference phoneme targets for a curated word/sound list in English and Urdu Qaida, including the hard-to-distinguish pairs (ق vs ک, ع, ح, خ).

**Implementation:** No off-the-shelf "Urdu pronunciation-correction library" exists — we checked. What does exist is **PronouncUR**, a real open-source Urdu grapheme-to-phoneme lexicon generator. It auto-generates a first-pass phoneme dictionary for our word list; we then hand-verify the highest-stakes phonemes with a native speaker rather than trusting auto-generated output for our demo words. This is the PRD's own "custom Urdu Phoneme Mapping Dictionary," just accelerated with a real tool instead of built from zero.

**Why this tech:** Saves dictionary-building time without pretending a correction library exists where it doesn't.

**Status:** TO BUILD (Day 1, dictionary curation).

---

## 3. LLM Reasoning Layer — Gemini 3.5 Flash-Lite (Qwen removed)
**What it does:** Two jobs: (a) turns structured acoustic-mismatch and timing data into encouraging, age-appropriate feedback text and comprehension questions; (b) for hesitation/disfluency patterns, takes the raw audio directly for a judgment call (nervous pause vs. genuinely not knowing the word) rather than relying on a pause-length threshold alone.

**Implementation:** Google AI Studio Gemini API calls (model ID `gemini-3.5-flash-lite`, or the current free-tier Flash-Lite model — **confirm the exact model ID is on the free tier on Google's live pricing page before committing**, since free-tier status is set per model ID, not per model family). Use a dedicated API key/project reserved for demo day, separate from the one used for Day 1–2 development testing, so debugging traffic doesn't eat into the requests-per-day quota needed for the actual pitch.

**Why this tech (and what it is not):** Gemini 3.5 Flash-Lite is a real, current, cost-free option that can genuinely do both jobs above. It is explicitly **not** the acoustic-evidence engine — that's still librosa (Feature 1), untouched. Naming Gemini as "the thing that hears pronunciation" would recreate the exact "isn't this just Whisper?" trap with a different vendor.

**Honest cost of this swap:** This is not the mandated Alibaba Cloud sponsor integration. It is a genuine, working technical layer, but it does not satisfy "native integration with Alibaba Cloud Model Studio (Qwen AI)" — see the chat response's Step 1 and Step 6 for what this costs on the scorecard and one avenue worth checking before accepting it as final.

**Status:** TO BUILD (Day 1). Before committing: verify the exact Gemini model ID's free-tier status and confirm it supports audio input at the free tier — don't assume from the model family name.

---

## 4. Gamified Reading Buddy (reduced scope)
**What it does:** A single linear story with 3–5 fixed checkpoints; correct pronunciation at each checkpoint advances the story.

**Implementation:** React + Bootstrap frontend, calling the acoustic engine at each fixed checkpoint. No branching logic.

**Why this tech:** React+Bootstrap is a lateral framework swap from the original Next.js/Tailwind assumption — same functional scope, faster to stand up for a small, fixed UI.

**Status:** TO BUILD (Day 2).

---

## 5. Hesitation & Fluency Screening (reframed)
**What it does:** Flags pause length, words-per-minute, and fluency patterns as an informal signal for teachers/parents to follow up on — explicitly **not** a diagnostic claim about dyslexia or stuttering.

**Implementation:** Pause/WPM heuristic from librosa timing data, optionally refined by the Gemini 3.5 Flash-Lite call in Feature 3(b) for ambiguous cases.

**Why this tech:** Reframing from "diagnostic" to "screening flag" removes an unvalidated medical claim more likely to draw skepticism than admiration from judges.

**Status:** TO BUILD (heuristic, Day 1). Structured diagnostic export for specialists: **ROADMAP-ONLY** — never demoed.

---

## 6. Offline Local Classroom Mesh
**What it does:** Runs feedback entirely on the teacher's laptop with no internet, then syncs to the cloud on reconnect.

**Implementation:** Local WebSocket host + a genuinely local, quantized Whisper model (whisper.cpp or faster-whisper, INT8) — **not Groq**, which is cloud-only and cannot run during this demo — plus the same local librosa engine and phoneme dictionary. Feedback text falls back to pre-written templates offline, since Groq and Gemini are both cloud services and unavailable without internet.

**Why this tech:** Groq's speed is a genuine online-path advantage but can't substitute for local inference — this feature needs its own model, unchanged from the original plan.

**Status:** TO BUILD (Day 2).

---

## 7. Parent Updates via WhatsApp/SMS
**What it does:** Sends a progress summary in Urdu to a parent's phone.

**Implementation:** One pre-sent example message, shown/played during the pitch. Live send-on-demand is not built.

**Why this tech:** Supporting evidence for the impact story, not a rubric-differentiating technical surface — not worth live-integration risk in a 3-day window.

**Status:** The example message: BUILT as a static artifact. The live pipeline: **ROADMAP-ONLY**.

---

## 8. Educator Analytics & Heatmap Dashboard
**What it does:** Shows class-wide pronunciation error patterns and individual student progress.

**Implementation:** React + Bootstrap + Chart.js/Recharts, seeded from real session data (including repeated single-user test runs if multi-student data isn't available in time).

**Why this tech:** Same framework swap as Feature 4; charting libraries are React-compatible regardless of the Next.js→React+Bootstrap change.

**Status:** TO BUILD (Day 2).
