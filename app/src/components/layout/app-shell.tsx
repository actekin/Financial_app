'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      {/* pt-14 clears the fixed mobile top bar */}
      <main className="flex-1 min-w-0 overflow-auto pt-14 md:pt-0">{children}</main>
    </div>
  );
}
