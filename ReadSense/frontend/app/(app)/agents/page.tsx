import { redirect } from "next/navigation";

/**
 * The old "AI Agents Command Center" (hardcoded fake agents + fabricated logs)
 * was replaced by the real Pipeline Monitor (roadmap Phase 11.2). Keep the old
 * URL working by redirecting.
 */
export default function AgentsPage() {
  redirect("/pipeline");
}
