"use client";

import { SpeakFlowProvider } from "@/context/SpeakFlowContext";
import { SpeakFlowSessionProvider } from "@/context/SpeakFlowSessionContext";
import { AuthProvider } from "@/components/auth/AuthProvider";
import StudentBinding from "@/components/auth/StudentBinding";

/**
 * Thin client-boundary wrapper so layout.tsx (a Server Component) can
 * safely include context providers that use browser-only APIs.
 * AuthProvider (outermost) gates every route; StudentBinding ties the classic
 * engine to the logged-in student's own roster entry; the v2 session provider
 * drives Story Mode.
 */
export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SpeakFlowProvider>
        <StudentBinding />
        <SpeakFlowSessionProvider>{children}</SpeakFlowSessionProvider>
      </SpeakFlowProvider>
    </AuthProvider>
  );
}
