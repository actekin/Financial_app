import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { toCents } from '@/lib/utils/money';
import { getGoalsWithProgress } from '@/lib/advisor/analysis';

export async function GET() {
  try {
    const goals = await getGoalsWithProgress();
    return NextResponse.json(goals);
  } catch (error: unknown) {
    console.error('Error fetching goals:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, emoji, targetAmount, savedAmount, currency, targetDate, linkedAccountId, notes } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Goal name is required' }, { status: 400 });
    }
    const target = Number(targetAmount);
    if (!Number.isFinite(target) || target <= 0) {
      return NextResponse.json({ error: 'Target amount must be a positive number' }, { status: 400 });
    }
    if (!currency) {
      return NextResponse.json({ error: 'Currency is required' }, { status: 400 });
    }

    const { lastId } = await db.run(
      `INSERT INTO goals (name, emoji, target_amount, saved_amount, currency, target_date, linked_account_id, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        emoji || null,
        toCents(target),
        toCents(Number(savedAmount) || 0),
        currency,
        targetDate || null,
        linkedAccountId || null,
        notes || null,
        new Date().toISOString(),
      ]
    );

    const created = await db.get('SELECT * FROM goals WHERE id = ?', [lastId]);
    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating goal:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
