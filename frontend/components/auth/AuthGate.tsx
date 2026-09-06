"use client";

/**
 * Route guard: requires a logged-in user, and enforces role rules by path:
 *  - teacher-only: /teacher, /students, /sessions, /pipeline, /reports,
 *    /progress (/settings is shared — the page renders per role)
 *  - student-only: /dashboard (the Gen-1 classic reading engine is the
 *    student's page — teachers are redirected to their own hub)
 *  - shared: /practice
 * Redirects unauthenticated users to /login and wrong-role users home.
 */

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "./AuthProvider";

const TEACHER_ONLY = ["/teacher", "/students", "/sessions", "/pipeline", "/reports", "/progress"];
const STUDENT_ONLY = ["/dashboard"];

export function homeFor(role?: string | null): string {
  return role === "teacher" ? "/teacher" : "/dashboard";
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, isTeacher } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/")}`);
      return;
    }
    const matches = (list: string[]) =>
      list.some((p) => pathname === p || pathname.startsWith(p + "/"));

    const needsTeacher = matches(TEACHER_ONLY);
    if (needsTeacher && !isTeacher) {
      // Exception: a student may view their OWN progress page
      const ownMatch = pathname.match(/^\/students\/([^/]+)$/);
      const isOwnProgress = !!(
        ownMatch && user.student_id && ownMatch[1] === user.student_id
      );
      if (!isOwnProgress) {
        router.replace(homeFor(user.role));
      }
      return;
    }
    if (matches(STUDENT_ONLY) && isTeacher) {
      router.replace(homeFor(user.role));
    }
  }, [user, loading, isTeacher, pathname, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base">
        <Loader2 className="w-8 h-8 text-accent-primary-dark animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
