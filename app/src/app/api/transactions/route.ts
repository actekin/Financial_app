import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { transactions } from '@/lib/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const category = searchParams.get('category');

  let query = db.select().from(transactions);

  const conditions = [];
  if (accountId) conditions.push(eq(transactions.accountId, parseInt(accountId)));
  if (startDate) conditions.push(gte(transactions.date, startDate));
  if (endDate) conditions.push(lte(transactions.date, endDate));
  if (category) conditions.push(eq(transactions.autoCategory, category));

  const result = conditions.length > 0
    ? query.where(and(...conditions)).all()
    : query.all();

  return NextResponse.json(result);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, autoCategory, description, direction } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (autoCategory !== undefined) updates.autoCategory = autoCategory;
  if (description !== undefined) updates.description = description;
  if (direction !== undefined) updates.direction = direction;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  db.update(transactions)
    .set(updates)
    .where(eq(transactions.id, id))
    .run();

  return NextResponse.json({ success: true });
}
