import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';

export async function GET() {
  try {
    const allAccounts = await db.all('SELECT * FROM accounts ORDER BY id');
    return NextResponse.json(allAccounts);
  } catch (error: unknown) {
    console.error('Error fetching accounts:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bank, name, type, currency, groupName } = body;

    if (!bank || !name || !type || !currency) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { lastId } = await db.run(
      'INSERT INTO accounts (bank, name, type, currency, group_name, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [bank, name, type, currency, groupName || null, new Date().toISOString()]
    );

    const result = await db.get('SELECT * FROM accounts WHERE id = ?', [lastId]);
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating account:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    await db.run('DELETE FROM accounts WHERE id = ?', [parseInt(id)]);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting account:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
