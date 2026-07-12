'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import {
  LayoutDashboard,
  Upload,
  Wallet,
  List,
  Target,
  Sparkles,
  LogOut,
  Waves,
  Menu,
  X,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/advisor', label: 'Advisor', icon: Sparkles },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/transactions', label: 'Transactions', icon: List },
  { href: '/accounts', label: 'Accounts', icon: Wallet },
  { href: '/upload', label: 'Upload', icon: Upload },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {NAV_ITEMS.map(item => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors',
              isActive
                ? 'bg-blue-600/20 text-blue-300 font-medium'
                : 'text-gray-400 hover:bg-gray-800/80 hover:text-white'
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
        <Waves className="w-4 h-4 text-blue-400" />
      </div>
      <div>
        <h1 className="text-base font-semibold text-white tracking-tight leading-none">FinFlow</h1>
        <p className="text-[11px] text-gray-500 mt-0.5">Household finances</p>
      </div>
    </div>
  );
}

function UserFooter() {
  const router = useRouter();
  const [user, setUser] = useState<string | null>(null);
  const [authEnabled, setAuthEnabled] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        setUser(data.user);
        setAuthEnabled(data.authEnabled);
      })
      .catch(() => {});
  }, []);

  if (!authEnabled) return null;

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="px-3 py-3 border-t border-gray-800/80 flex items-center justify-between">
      <div className="flex items-center gap-2.5 px-2 min-w-0">
        <div className="w-7 h-7 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-[11px] font-semibold text-gray-300 shrink-0">
          {(user || '?').slice(0, 1).toUpperCase()}
        </div>
        <span className="text-sm text-gray-300 truncate">{user || '…'}</span>
      </div>
      <button
        onClick={logout}
        title="Sign out"
        className="p-2 text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors shrink-0"
      >
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const active = NAV_ITEMS.find(i => i.href === pathname);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-gray-950 text-gray-300 flex-col border-r border-gray-800 min-h-screen sticky top-0 h-screen">
        <Brand />
        <NavLinks />
        <UserFooter />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between bg-gray-950/95 backdrop-blur border-b border-gray-800 px-4 h-14">
        <div className="flex items-center gap-2">
          <Waves className="w-4.5 h-4.5 text-blue-400" />
          <span className="text-sm font-semibold text-white">FinFlow</span>
          {active && <span className="text-sm text-gray-500">/ {active.label}</span>}
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <aside
            className="absolute left-0 top-0 bottom-0 w-64 bg-gray-950 border-r border-gray-800 flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pr-3">
              <Brand />
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 text-gray-500 hover:text-white rounded-lg hover:bg-gray-800"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setMobileOpen(false)} />
            <UserFooter />
          </aside>
        </div>
      )}
    </>
  );
}
