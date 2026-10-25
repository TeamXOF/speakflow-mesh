/**
 * Formats backend phoneme mismatch labels into child- and teacher-friendly labels.
 */

export function prettyPhoneme(label: string | null | undefined): string {
  if (!label) return "";
  const trimmed = label.trim();
  if (!trimmed) return "";

  if (trimmed === "extra word") return "Extra word";
  if (trimmed === "unclear") return "Unclear sound";

  if (trimmed.includes("_vs_")) {
    return trimmed.split("_vs_").map((s) => s.trim()).join(" vs ");
  }

  return trimmed;
}
