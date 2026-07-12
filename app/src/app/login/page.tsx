'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Waves, Lock, ArrowRight } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [members, setMembers] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (!data.authEnabled || data.user) {
          router.replace('/');
          return;
        }
        if (Array.isArray(data.members) && data.members.length > 0) {
          setMembers(data.members);
          setName(data.members[0]);
        }
      })
      .catch(() => {});
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Login failed');
        return;
      }
      router.replace(searchParams.get('from') || '/');
      router.refresh();
    } catch {
      setError('Could not reach the server. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mb-4">
            <Waves className="w-6 h-6 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">FinFlow</h1>
          <p className="text-sm text-gray-500 mt-1">Your household finances, in one place</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5 shadow-xl"
        >
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Who&apos;s signing in?</label>
            {members.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {members.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setName(m)}
                    className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                      name === m
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                        : 'bg-gray-800/60 border-gray-700 text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="username"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
                required
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Household password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !name}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl px-4 py-2.5 transition-colors"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
            {!submitting && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <p className="text-center text-xs text-gray-600 mt-6">
          One shared password for the whole household. Set it with the{' '}
          <code className="text-gray-500">APP_PASSWORD</code> environment variable.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
