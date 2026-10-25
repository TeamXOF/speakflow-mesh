"use client";

export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export function speak(text: string, lang: string = "en", rate: number = 1.0): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();

  const clean = text.trim();
  if (!clean) return;

  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.rate = rate;

  const isUrdu = lang === "ur" || lang.startsWith("ur");
  utterance.lang = isUrdu ? "ur-PK" : "en-US";

  try {
    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find((v) =>
      isUrdu
        ? v.lang.toLowerCase().includes("ur") || v.lang.includes("PK")
        : v.lang.toLowerCase().startsWith("en")
    );
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }
  } catch {
    // fallback to browser default voice
  }

  window.speechSynthesis.speak(utterance);
}
