'use client';

import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';

const NAME_STORAGE_KEY = 'finflow_last_name';

export default function LoginPage() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(NAME_STORAGE_KEY);
    if (saved) setName(saved);
  }, []);

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
        setError(data.error || 'Sign-in failed. Please try again.');
        return;
      }
      localStorage.setItem(NAME_STORAGE_KEY, name.trim());
      window.location.href = '/';
    } catch {
      setError('Sign-in failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-950 p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-xl p-8 space-y-5"
      >
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-5 h-5 text-blue-400" />
          </div>
          <h1 className="text-xl font-bold text-white">FinFlow</h1>
          <p className="text-sm text-gray-400 mt-1">Sign in to your household dashboard</p>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Your name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Arda"
            autoFocus={!name}
            required
            maxLength={50}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
          />
          <p className="text-xs text-gray-600 mt-1">Used to record who updated what.</p>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Household password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus={!!name}
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {submitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
