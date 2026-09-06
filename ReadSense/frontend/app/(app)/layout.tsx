import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import NotificationToaster from "@/components/layout/NotificationToaster";
import AuthGate from "@/components/auth/AuthGate";

/**
 * Teacher/admin shell (sidebar + topbar). Kid-facing Story Mode lives OUTSIDE
 * this route group and renders fullscreen with no chrome. AuthGate enforces
 * login + per-path role rules (roadmap: role-based access).
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <Sidebar />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>

        <NotificationToaster />
      </div>
    </AuthGate>
  );
}
