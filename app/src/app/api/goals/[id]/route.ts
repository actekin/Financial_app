import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { toCents } from '@/lib/utils/money';

async function parseId(params: Promise<{ id: string }>): Promise<number | null> {
  const { id } = await params;
  const parsed = parseInt(id, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const id = await parseId(ctx.params);
    if (id === null) return NextResponse.json({ error: 'Invalid goal id' }, { status: 400 });

    const existing = await db.get('SELECT * FROM goals WHERE id = ?', [id]);
    if (!existing) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });

    const body = await request.json();
    const sets: string[] = [];
    const values: unknown[] = [];

    if (body.name !== undefined) { sets.push('name = ?'); values.push(String(body.name).trim()); }
    if (body.emoji !== undefined) { sets.push('emoji = ?'); values.push(body.emoji || null); }
    if (body.targetAmount !== undefined) {
      const target = Number(body.targetAmount);
      if (!Number.isFinite(target) || target <= 0) {
        return NextResponse.json({ error: 'Target amount must be positive' }, { status: 400 });
      }
      sets.push('target_amount = ?'); values.push(toCents(target));
    }
    if (body.savedAmount !== undefined) {
      sets.push('saved_amount = ?'); values.push(toCents(Number(body.savedAmount) || 0));
    }
    // Convenience for "add contribution" without racing on absolute values
    if (body.addContribution !== undefined) {
      const delta = Number(body.addContribution);
      if (Number.isFinite(delta)) {
        sets.push('saved_amount = MAX(saved_amount + ?, 0)');
        values.push(toCents(delta));
      }
    }
    if (body.currency !== undefined) { sets.push('currency = ?'); values.push(body.currency); }
    if (body.targetDate !== undefined) { sets.push('target_date = ?'); values.push(body.targetDate || null); }
    if (body.linkedAccountId !== undefined) { sets.push('linked_account_id = ?'); values.push(body.linkedAccountId || null); }
    if (body.notes !== undefined) { sets.push('notes = ?'); values.push(body.notes || null); }

    if (sets.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id);
    await db.run(`UPDATE goals SET ${sets.join(', ')} WHERE id = ?`, values);
    const updated = await db.get('SELECT * FROM goals WHERE id = ?', [id]);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error('Error updating goal:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const id = await parseId(ctx.params);
    if (id === null) return NextResponse.json({ error: 'Invalid goal id' }, { status: 400 });

    const { changes } = await db.run('DELETE FROM goals WHERE id = ?', [id]);
    if (changes === 0) return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting goal:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
