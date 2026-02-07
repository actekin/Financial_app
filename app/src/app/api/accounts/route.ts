import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { accounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const allAccounts = db.select().from(accounts).all();
  return NextResponse.json(allAccounts);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bank, name, type, currency, groupName } = body;

    if (!bank || !name || !type || !currency) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = db.insert(accounts).values({
      bank,
      name,
      type,
      currency,
      groupName: groupName || null,
      createdAt: new Date().toISOString(),
    }).returning().get();

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating account:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  db.delete(accounts).where(eq(accounts.id, parseInt(id))).run();
  return NextResponse.json({ success: true });
}
