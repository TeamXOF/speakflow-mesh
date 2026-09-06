"use client";

/**
 * Kid navigation bar for the fullscreen Story Mode area — so a student is
 * NEVER trapped without navigation. Slim, playful, role-aware.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AudioLines, LayoutDashboard, BookOpen, LineChart, Target, LogOut, GraduationCap } from "lucide-react";
import { useAuth } from "./AuthProvider";

export default function KidNav() {
  const { user, logout, isTeacher } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // "My Progress" only exists for accounts linked to a roster student —
  // an unlinked student_id would produce a /students/undefined dead link.
  const links = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Story Mode", href: "/read", icon: BookOpen },
    ...(user?.student_id
      ? [{ name: "My Progress", href: `/students/${user.student_id}`, icon: LineChart, match: "/students/" }]
      : []),
    { name: "Practice", href: "/practice", icon: Target },
  ];

  const isActive = (l: typeof links[number]) =>
    l.match ? pathname.startsWith(l.match) : pathname === l.href;

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/read" className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-lg bg-accent-primary flex items-center justify-center">
            <AudioLines className="w-5 h-5 text-white" />
          </span>
          <span className="font-extrabold text-text-primary">
            SpeakFlow<span className="text-accent-primary-dark">AI</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((l) => {
            const Icon = l.icon;
            const active = isActive(l);
            return (
              <Link
                key={l.name}
                href={l.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  active
                    ? "bg-accent-primary-bg text-accent-primary-dark"
                    : "text-text-secondary hover:bg-gray-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{l.name}</span>
              </Link>
            );
          })}
          {isTeacher && (
            <Link
              href="/teacher"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-text-secondary hover:bg-gray-50"
              title="Teacher Hub"
            >
              <GraduationCap className="w-4 h-4" />
            </Link>
          )}
          <button
            onClick={handleLogout}
            title="Log out"
            className="ml-1 p-2 rounded-full text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </nav>
      </div>
    </div>
  );
}
