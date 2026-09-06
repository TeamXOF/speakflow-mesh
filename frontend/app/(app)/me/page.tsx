"use client";

/** Student "My Progress" — sends the student to their own progress page. */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

export default function MyProgressPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    if (user.role === "teacher" || !user.student_id) {
      router.replace("/students");
    } else {
      router.replace(`/students/${user.student_id}`);
    }
  }, [user, loading, router]);

  return (
    <div className="max-w-6xl mx-auto py-20 text-center text-text-muted">
      <Loader2 className="w-8 h-8 text-accent-primary-dark animate-spin mx-auto mb-4" />
      Opening your progress…
      <span className="sr-only"><Link href="/students">students</Link></span>
    </div>
  );
}
