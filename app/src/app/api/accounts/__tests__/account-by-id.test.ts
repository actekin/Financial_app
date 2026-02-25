import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockDb = vi.hoisted(() => ({
  all: vi.fn(),
  get: vi.fn(),
  run: vi.fn(),
}));

vi.mock('@/lib/db/client', () => ({
  db: mockDb,
}));

import { GET, PUT, DELETE } from '../[id]/route';

function makeRequest(url: string, init?: { method?: string; body?: string }): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'), init);
}

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const sampleAccount = {
  id: 1,
  bank: 'chase',
  name: 'Chase Checking',
  type: 'checking',
  currency: 'USD',
  isActive: true,
  groupName: null,
  createdAt: '2025-01-15T10:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/accounts/[id]', () => {
  it('returns the account when found', async () => {
    mockDb.get.mockResolvedValue(sampleAccount);

    const res = await GET(makeRequest('/api/accounts/1'), makeContext('1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(sampleAccount);
    expect(mockDb.get).toHaveBeenCalledWith('SELECT * FROM accounts WHERE id = ?', [1]);
  });

  it('returns 404 when account not found', async () => {
    mockDb.get.mockResolvedValue(undefined);

    const res = await GET(makeRequest('/api/accounts/999'), makeContext('999'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('Account not found');
  });

  it('returns 400 for non-numeric id', async () => {
    const res = await GET(makeRequest('/api/accounts/abc'), makeContext('abc'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Invalid account id');
  });
});

describe('PUT /api/accounts/[id]', () => {
  it('updates and returns the account', async () => {
    const updated = { ...sampleAccount, name: 'Chase Savings' };
    mockDb.get
      .mockResolvedValueOnce(sampleAccount)   // existence check
      .mockResolvedValueOnce(updated);         // return updated
    mockDb.run.mockResolvedValue({ lastId: 1, changes: 1 });

    const res = await PUT(
      makeRequest('/api/accounts/1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Chase Savings' }),
      }),
      makeContext('1'),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.name).toBe('Chase Savings');
    expect(mockDb.run).toHaveBeenCalledWith(
      'UPDATE accounts SET name = ? WHERE id = ?',
      ['Chase Savings', 1],
    );
  });

  it('updates multiple fields at once', async () => {
    mockDb.get
      .mockResolvedValueOnce(sampleAccount)
      .mockResolvedValueOnce({ ...sampleAccount, name: 'New Name', bank: 'lloyds' });
    mockDb.run.mockResolvedValue({ lastId: 1, changes: 1 });

    const res = await PUT(
      makeRequest('/api/accounts/1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'New Name', bank: 'lloyds' }),
      }),
      makeContext('1'),
    );

    expect(res.status).toBe(200);
    expect(mockDb.run).toHaveBeenCalledWith(
      'UPDATE accounts SET bank = ?, name = ? WHERE id = ?',
      ['lloyds', 'New Name', 1],
    );
  });

  it('handles isActive boolean conversion', async () => {
    mockDb.get
      .mockResolvedValueOnce(sampleAccount)
      .mockResolvedValueOnce({ ...sampleAccount, isActive: false });
    mockDb.run.mockResolvedValue({ lastId: 1, changes: 1 });

    const res = await PUT(
      makeRequest('/api/accounts/1', {
        method: 'PUT',
        body: JSON.stringify({ isActive: false }),
      }),
      makeContext('1'),
    );

    expect(res.status).toBe(200);
    expect(mockDb.run).toHaveBeenCalledWith(
      'UPDATE accounts SET is_active = ? WHERE id = ?',
      [0, 1],
    );
  });

  it('returns 404 when account not found', async () => {
    mockDb.get.mockResolvedValue(undefined);

    const res = await PUT(
      makeRequest('/api/accounts/999', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated' }),
      }),
      makeContext('999'),
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('Account not found');
  });

  it('returns 400 when no fields provided', async () => {
    mockDb.get.mockResolvedValue(sampleAccount);

    const res = await PUT(
      makeRequest('/api/accounts/1', {
        method: 'PUT',
        body: JSON.stringify({}),
      }),
      makeContext('1'),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('No fields to update');
  });

  it('returns 400 for non-numeric id', async () => {
    const res = await PUT(
      makeRequest('/api/accounts/abc', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Test' }),
      }),
      makeContext('abc'),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Invalid account id');
  });
});

describe('DELETE /api/accounts/[id]', () => {
  it('deletes account and related data', async () => {
    mockDb.get.mockResolvedValue(sampleAccount);
    mockDb.run.mockResolvedValue({ lastId: 0, changes: 1 });

    const res = await DELETE(makeRequest('/api/accounts/1'), makeContext('1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);

    // Should delete related data first, then the account
    expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM transactions WHERE account_id = ?', [1]);
    expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM snapshots WHERE account_id = ?', [1]);
    expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM upload_logs WHERE account_id = ?', [1]);
    expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM accounts WHERE id = ?', [1]);
  });

  it('returns 404 when account not found', async () => {
    mockDb.get.mockResolvedValue(undefined);

    const res = await DELETE(makeRequest('/api/accounts/999'), makeContext('999'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('Account not found');
  });

  it('returns 400 for non-numeric id', async () => {
    const res = await DELETE(makeRequest('/api/accounts/abc'), makeContext('abc'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Invalid account id');
  });
});
