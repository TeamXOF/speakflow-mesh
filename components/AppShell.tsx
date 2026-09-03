'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Student view is fullscreen, no sidebar/topbar
  const isStudentRoute = pathname?.startsWith('/read');

  if (isStudentRoute) {
    return <main className="min-h-screen bg-[var(--bg-base)]">{children}</main>;
  }

  // Teacher dashboard view
  return (
    <div className="flex min-h-screen bg-[var(--bg-base)]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
