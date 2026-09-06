"use client";

import { Bell, Search, Settings, User, LogOut, BookOpen, LineChart, Target } from "lucide-react";
import { useSpeakFlow } from "@/context/SpeakFlowContext";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";

function formatDistanceToNow(date: Date) {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
}

export default function Topbar() {
  const { notifications, markNotificationsAsRead, language, setLanguage } = useSpeakFlow();
  const { user, isTeacher, logout } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Wire the search box: teachers search the roster, students jump to Story Mode
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    if (isTeacher) router.push(`/students?q=${encodeURIComponent(q)}`);
    else router.push("/read");
  };

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setShowProfile(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && unreadCount > 0) {
      markNotificationsAsRead();
    }
  };

  return (
    <header className="bg-bg-card border-b border-border-dark h-16 flex items-center justify-between px-6 flex-shrink-0 relative z-50">
      {/* Search Bar */}
      <div className="flex-1 max-w-md">
        <form onSubmit={handleSearch}>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-text-muted" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent-primary focus:border-accent-primary bg-gray-50"
              placeholder={isTeacher ? "Search students… (Enter)" : "Jump to Story Mode…"}
            />
          </div>
        </form>
      </div>

      {/* Right side actions */}
      <div className="flex items-center space-x-4">
        
        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={handleNotificationClick}
            className="p-2 text-text-secondary hover:text-text-primary transition-colors relative"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-3 w-3 bg-red-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">
                {unreadCount}
              </span>
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden z-50">
              <div className="p-3 border-b border-gray-100 bg-gray-50 font-bold text-sm text-text-primary flex justify-between items-center">
                Notifications
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-text-muted">
                    No new notifications
                  </div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50/30' : ''}`}>
                      <div className="flex items-start">
                        <div className={`w-2 h-2 mt-1.5 rounded-full mr-3 flex-shrink-0 ${
                          n.type === 'success' ? 'bg-green-500' :
                          n.type === 'error' ? 'bg-red-500' :
                          n.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                        }`} />
                        <div>
                          <p className="text-sm font-bold text-text-primary">{n.title}</p>
                          <p className="text-xs text-text-secondary mt-1 leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-text-muted mt-2">{formatDistanceToNow(n.timestamp)} ago</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Reading language switch — drives sentences, STT, feedback and TTS */}
        <div className="flex items-center rounded-full border border-gray-200 bg-white p-0.5 mr-1 shrink-0" title="Reading language">
          <button
            onClick={() => setLanguage("en")}
            className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${language === "en" ? "bg-accent-primary-dark text-white" : "text-text-secondary hover:text-text-primary"}`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage("ur")}
            className={`px-2.5 py-1 rounded-full text-sm font-bold font-urdu transition-colors leading-none ${language === "ur" ? "bg-accent-primary-dark text-white" : "text-text-secondary hover:text-text-primary"}`}
          >
            اردو
          </button>
        </div>

        {/* Settings — teachers get the system console, students their own page */}
        <Link href="/settings" className="p-2 text-text-secondary hover:text-text-primary transition-colors">
          <Settings className="h-5 w-5" />
        </Link>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <div
            onClick={() => setShowProfile(!showProfile)}
            className="h-8 w-8 rounded-full bg-accent-primary-bg border border-accent-primary-dark/20 flex items-center justify-center overflow-hidden ml-2 cursor-pointer"
          >
            <User className="h-4 w-4 text-accent-primary-dark" />
          </div>

          {showProfile && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden z-50">
              <div className="p-3 border-b border-gray-100 bg-gray-50">
                <p className="text-sm font-bold text-text-primary">{user?.name || "Signed in"}</p>
                <p className="text-xs text-text-muted capitalize">{user?.role || "user"}</p>
              </div>
              <div className="py-1">
                <Link href="/settings" className="w-full flex items-center px-4 py-2 text-sm text-text-secondary hover:bg-gray-50 transition-colors">
                  <Settings className="w-4 h-4 mr-2" /> Preferences
                </Link>
                {!isTeacher && (
                  <>
                    <Link href="/dashboard" className="w-full flex items-center px-4 py-2 text-sm text-text-secondary hover:bg-gray-50 transition-colors">
                      <BookOpen className="w-4 h-4 mr-2" /> Reading Dashboard
                    </Link>
                    <Link href="/read" className="w-full flex items-center px-4 py-2 text-sm text-text-secondary hover:bg-gray-50 transition-colors">
                      <BookOpen className="w-4 h-4 mr-2" /> Story Mode
                    </Link>
                    <Link
                      href={user?.student_id ? `/students/${user.student_id}` : "/dashboard"}
                      className="w-full flex items-center px-4 py-2 text-sm text-text-secondary hover:bg-gray-50 transition-colors"
                    >
                      <LineChart className="w-4 h-4 mr-2" /> My Progress
                    </Link>
                    <Link href="/practice" className="w-full flex items-center px-4 py-2 text-sm text-text-secondary hover:bg-gray-50 transition-colors">
                      <Target className="w-4 h-4 mr-2" /> Practice Center
                    </Link>
                  </>
                )}
                <button
                  onClick={async () => { await logout(); router.replace("/login"); }}
                  className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-2" /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
