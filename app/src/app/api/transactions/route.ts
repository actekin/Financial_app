import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const category = searchParams.get('category');

    let sql = 'SELECT * FROM transactions WHERE 1=1';
    const params: unknown[] = [];

    if (accountId) { sql += ' AND account_id = ?'; params.push(parseInt(accountId)); }
    if (startDate) { sql += ' AND date >= ?'; params.push(startDate); }
    if (endDate) { sql += ' AND date <= ?'; params.push(endDate); }
    if (category) { sql += ' AND auto_category = ?'; params.push(category); }

    sql += ' ORDER BY date DESC';

    const result = await db.all(sql, params);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error fetching transactions:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, autoCategory, description, direction } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const sets: string[] = [];
    const params: unknown[] = [];

    if (autoCategory !== undefined) { sets.push('auto_category = ?'); params.push(autoCategory); }
    if (description !== undefined) { sets.push('description = ?'); params.push(description); }
    if (direction !== undefined) { sets.push('direction = ?'); params.push(direction); }

    if (sets.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    params.push(id);
    await db.run(`UPDATE transactions SET ${sets.join(', ')} WHERE id = ?`, params);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error updating transaction:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
