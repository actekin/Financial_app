import { NextResponse } from 'next/server';
import { buildFinancialContext } from '@/lib/advisor/analysis';

export async function GET() {
  try {
    const context = await buildFinancialContext();
    return NextResponse.json(context);
  } catch (error: unknown) {
    console.error('Error building financial context:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
