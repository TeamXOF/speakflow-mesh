"use client";

/**
 * Binds the classic engine context's activeStudent to the logged-in student's
 * own roster entry (role-based correctness for the Dashboard).
 */

import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useSpeakFlow } from "@/context/SpeakFlowContext";

export default function StudentBinding() {
  const { user, isTeacher } = useAuth();
  const { setActiveStudent } = useSpeakFlow();

  useEffect(() => {
    if (!user || isTeacher) return;
    if (user.student_id) {
      setActiveStudent({
        id: user.student_id,
        name: user.name,
        grade: "Grade 3",
        level: "Level 1",
      });
    }
  }, [user, isTeacher, setActiveStudent]);

  return null;
}
