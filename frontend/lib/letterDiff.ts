export type LetterDiffType = "match" | "substitute" | "insert" | "delete";

export interface LetterDiffOp {
  type: LetterDiffType;
  expected?: string;
  heard?: string;
}

/**
 * Computes letter-by-letter sequence alignment between expected and heard text
 * using the Wagner-Fischer algorithm.
 */
export function letterDiff(expected: string, heard: string): LetterDiffOp[] {
  const exp = Array.from((expected || "").trim());
  const hrd = Array.from((heard || "").trim());

  const n = exp.length;
  const m = hrd.length;

  if (n === 0 && m === 0) return [];
  if (n === 0) return hrd.map((c) => ({ type: "insert", heard: c }));
  if (m === 0) return exp.map((c) => ({ type: "delete", expected: c }));

  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (exp[i - 1].toLowerCase() === hrd[j - 1].toLowerCase()) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j - 1], // substitute
          dp[i - 1][j],     // delete
          dp[i][j - 1]      // insert
        );
      }
    }
  }

  let i = n;
  let j = m;
  const ops: LetterDiffOp[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && exp[i - 1].toLowerCase() === hrd[j - 1].toLowerCase()) {
      ops.unshift({ type: "match", expected: exp[i - 1], heard: hrd[j - 1] });
      i--;
      j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      ops.unshift({ type: "substitute", expected: exp[i - 1], heard: hrd[j - 1] });
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      ops.unshift({ type: "delete", expected: exp[i - 1] });
      i--;
    } else {
      ops.unshift({ type: "insert", heard: hrd[j - 1] });
      j--;
    }
  }

  return ops;
}
