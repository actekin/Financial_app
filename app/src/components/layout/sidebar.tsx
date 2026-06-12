'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import {
  LayoutDashboard,
  Upload,
  Wallet,
  List,
  Zap,
  LogOut,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/quick-update', label: 'Quick Update', icon: Zap },
  { href: '/accounts', label: 'Accounts', icon: Wallet },
  { href: '/upload', label: 'Upload', icon: Upload },
  { href: '/transactions', label: 'Transactions', icon: List },
];

export function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<{ authEnabled: boolean; name: string | null } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (data) setUser(data); })
      .catch(() => {});
  }, []);

  if (pathname === '/login') return null;

  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.href = '/login';
  }

  return (
    <aside className="w-56 bg-gray-950 text-gray-300 flex flex-col border-r border-gray-800 min-h-screen">
      <div className="px-5 py-5 border-b border-gray-800">
        <h1 className="text-lg font-semibold text-white tracking-tight">FinFlow</h1>
        <p className="text-xs text-gray-500 mt-0.5">Personal Finance</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'hover:bg-gray-800 hover:text-white'
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      {user?.authEnabled && user.name && (
        <div className="px-3 py-4 border-t border-gray-800">
          <div className="flex items-center justify-between px-3">
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Signed in as</p>
              <p className="text-sm text-white truncate">{user.name}</p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
