import { cn } from '@/lib/utils/cn';
import type { LucideIcon } from 'lucide-react';

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-12 h-12 rounded-2xl bg-gray-800/80 border border-gray-700/50 flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-gray-500" />
      </div>
      <h3 className="text-sm font-medium text-gray-300">{title}</h3>
      {description && <div className="text-sm text-gray-500 mt-1.5 max-w-sm">{description}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ProgressBar({
  value,
  className,
  barClassName,
}: {
  value: number; // 0-100
  className?: string;
  barClassName?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('h-2 rounded-full bg-gray-800 overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full bg-blue-500 transition-all duration-500', barClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-gray-800/70', className)} />;
}

const BUTTON_VARIANTS = {
  primary: 'bg-blue-600 hover:bg-blue-500 text-white',
  secondary: 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700',
  danger: 'text-red-400 hover:bg-red-950/60 border border-transparent hover:border-red-900/50',
  ghost: 'text-gray-400 hover:text-gray-200 hover:bg-gray-800',
} as const;

export function Button({
  variant = 'primary',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BUTTON_VARIANTS }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        BUTTON_VARIANTS[variant],
        className
      )}
      {...props}
    />
  );
}

export const inputClass =
  'w-full bg-gray-800 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20';

export const selectClass =
  'w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/60';
