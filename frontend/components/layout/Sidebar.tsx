"use client";

/**
 * Dark sidebar per the UI guide's teacher mock: near-black rail, SpeakFlow
 * logo, nav items with the active one as a filled lavender pill, and the
 * signed-in user + logout at the bottom. Nav items are filtered by role:
 *  - Teacher: Teacher Hub, Students, Reading Sessions, Pipeline Monitor,
 *    Practice Center, Reports, Progress Tracker, Settings
 *  - Student: Dashboard (classic engine), Story Mode, My Progress, Practice
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  History,
  Activity,
  Target,
  FileText,
  LineChart,
  Settings,
  LogOut,
  GraduationCap,
  BookOpen,
  AudioLines,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

const TEACHER_NAV = [
  { name: "Teacher Hub", href: "/teacher", icon: GraduationCap },
  { name: "Students", href: "/students", icon: Users },
  { name: "Reading Sessions", href: "/sessions", icon: History },
  { name: "Pipeline Monitor", href: "/pipeline", icon: Activity },
  { name: "Practice Center", href: "/practice", icon: Target },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Progress Tracker", href: "/progress", icon: LineChart },
  { name: "Settings", href: "/settings", icon: Settings },
];

const STUDENT_NAV = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Story Mode", href: "/read", icon: BookOpen },
  { name: "My Progress", href: "/me", icon: LineChart },
  { name: "Practice Center", href: "/practice", icon: Target },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isTeacher } = useAuth();

  const navItems = isTeacher ? TEACHER_NAV : STUDENT_NAV;

  const isActive = (href: string) =>
    (href === "/me" && pathname.startsWith("/students/")) ||
    pathname === href ||
    pathname.startsWith(href + "/") ||
    (pathname === "/" && href === "/dashboard");

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const initials = (user?.name || "?")
    .split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="flex flex-col h-full bg-[#161616] text-white">
      {/* Logo */}
      <div className="p-5 flex items-center gap-2.5">
        <span className="h-10 w-10 rounded-xl bg-accent-primary flex items-center justify-center shadow-lg">
          <AudioLines className="w-5 h-5 text-white" />
        </span>
        <div>
          <h1 className="text-lg font-extrabold leading-tight">
            SpeakFlow<span className="text-accent-primary">AI</span>
          </h1>
          <p className="text-[9px] font-mono uppercase tracking-wider text-gray-500">Every reader. Every day.</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center px-4 py-2.5 text-sm font-bold rounded-xl transition-all ${
                    active
                      ? "bg-accent-primary-dark text-white shadow-lg"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Current user + logout */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="h-9 w-9 rounded-full bg-accent-primary-bg text-accent-primary-dark flex items-center justify-center text-xs font-extrabold">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold truncate">{user?.name || "…"}</p>
            <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
              {isTeacher ? "Teacher" : "Student"}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center px-4 py-2 text-sm font-bold rounded-xl text-gray-300 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Log out
        </button>
      </div>
    </div>
  );
}
