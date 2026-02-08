import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const accountId = parseInt(id, 10);
    if (isNaN(accountId)) {
      return NextResponse.json({ error: 'Invalid account id' }, { status: 400 });
    }

    const account = await db.get('SELECT * FROM accounts WHERE id = ?', [accountId]);
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json(account);
  } catch (error: unknown) {
    console.error('Error fetching account:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const accountId = parseInt(id, 10);
    if (isNaN(accountId)) {
      return NextResponse.json({ error: 'Invalid account id' }, { status: 400 });
    }

    const existing = await db.get('SELECT * FROM accounts WHERE id = ?', [accountId]);
    if (!existing) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const body = await request.json();
    const { bank, name, type, currency, groupName, isActive } = body;

    const sets: string[] = [];
    const params: unknown[] = [];

    if (bank !== undefined) { sets.push('bank = ?'); params.push(bank); }
    if (name !== undefined) { sets.push('name = ?'); params.push(name); }
    if (type !== undefined) { sets.push('type = ?'); params.push(type); }
    if (currency !== undefined) { sets.push('currency = ?'); params.push(currency); }
    if (groupName !== undefined) { sets.push('group_name = ?'); params.push(groupName); }
    if (isActive !== undefined) { sets.push('is_active = ?'); params.push(isActive ? 1 : 0); }

    if (sets.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    params.push(accountId);
    await db.run(`UPDATE accounts SET ${sets.join(', ')} WHERE id = ?`, params);

    const updated = await db.get('SELECT * FROM accounts WHERE id = ?', [accountId]);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error('Error updating account:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const accountId = parseInt(id, 10);
    if (isNaN(accountId)) {
      return NextResponse.json({ error: 'Invalid account id' }, { status: 400 });
    }

    const existing = await db.get('SELECT * FROM accounts WHERE id = ?', [accountId]);
    if (!existing) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    await db.run('DELETE FROM transactions WHERE account_id = ?', [accountId]);
    await db.run('DELETE FROM snapshots WHERE account_id = ?', [accountId]);
    await db.run('DELETE FROM upload_logs WHERE account_id = ?', [accountId]);
    await db.run('DELETE FROM accounts WHERE id = ?', [accountId]);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting account:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
