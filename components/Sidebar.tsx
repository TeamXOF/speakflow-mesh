'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  TrendingUp, 
  FileText, 
  Settings, 
  Activity 
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Students', href: '/students', icon: Users },
  { name: 'Sessions', href: '/sessions', icon: BookOpen },
  { name: 'Progress', href: '/progress', icon: TrendingUp },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Pipeline Monitor', href: '/pipeline', icon: Activity },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[240px] bg-white border-r border-[var(--border-color)] flex flex-col min-h-screen">
      <div className="p-6 border-b border-[var(--border-color)]">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Activity className="text-[var(--accent-primary)]" />
          SpeakFlow
        </h1>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isActive 
                  ? 'bg-[var(--accent-primary)] text-black font-semibold' 
                  : 'text-[var(--text-secondary)] hover:bg-gray-100 hover:text-black'
              }`}
            >
              <item.icon size={20} className={isActive ? 'text-black' : ''} />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
