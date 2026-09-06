"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { homeFor } from "@/components/auth/AuthGate";

/** Entry point: route each visitor to their role's home (or the login page). */
export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? homeFor(user.role) : "/login");
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-base">
      <Loader2 className="w-8 h-8 text-accent-primary-dark animate-spin" />
    </div>
  );
}
