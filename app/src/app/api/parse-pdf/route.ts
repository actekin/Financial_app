import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Currency, TransactionDirection } from '@/types';

const PDF_PARSER_MODEL = process.env.PDF_PARSER_MODEL || 'claude-opus-5';

// Anthropic accepts requests up to 32MB; base64 inflates ~4/3, so cap the PDF at 20MB.
const MAX_PDF_BYTES = 20 * 1024 * 1024;

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    transactions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string', format: 'date', description: 'Transaction date as YYYY-MM-DD' },
          description: { type: 'string', description: 'Merchant / transaction description as printed' },
          amount: { type: 'number', description: 'Absolute amount in major units, always positive' },
          direction: {
            type: 'string',
            enum: [TransactionDirection.INFLOW, TransactionDirection.OUTFLOW],
            description: 'inflow = money into the account, outflow = money out',
          },
          currency: {
            type: 'string',
            enum: Object.values(Currency),
            description: 'Currency of this transaction',
          },
          excludeFromFlow: {
            type: 'boolean',
            description: 'true only for brokerage market buys/sells that are not real cash flow',
          },
        },
        required: ['date', 'description', 'amount', 'direction', 'currency', 'excludeFromFlow'],
        additionalProperties: false,
      },
    },
    warnings: {
      type: 'array',
      items: { type: 'string' },
      description: 'Anything ambiguous or unreadable in the statement worth telling the user',
    },
  },
  required: ['transactions', 'warnings'],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You extract transactions from bank and credit-card statement PDFs for a household finance app.

Rules:
- Extract every transaction row in the statement, in order. Do not invent, merge, or skip rows.
- Dates: output as YYYY-MM-DD. Infer the year from statement context when rows omit it. Statements from UK/European banks usually print DD/MM; US banks print MM/DD — use the statement's own conventions.
- Amounts: always positive numbers in major units. Use "direction" to indicate money in vs out. On credit-card statements, purchases are outflows and payments/refunds are inflows.
- Skip non-transaction lines: running balances, section headers, "opening balance"/"closing balance" rows, totals, interest-rate tables.
- Currency: use the statement's currency for each row; fall back to the account currency given by the user.
- Set excludeFromFlow=true only for brokerage market buy/sell rows (they move money between cash and positions, not in/out of the household).
- If part of the statement is unreadable or ambiguous, extract what you can and explain the gap in "warnings".`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pdfBase64 = typeof body.pdfBase64 === 'string' ? body.pdfBase64 : '';
    const filename = typeof body.filename === 'string' ? body.filename : 'statement.pdf';
    const accountCurrency =
      typeof body.currency === 'string' && (Object.values(Currency) as string[]).includes(body.currency)
        ? body.currency
        : Currency.USD;

    if (!pdfBase64) {
      return NextResponse.json({ error: 'pdfBase64 is required' }, { status: 400 });
    }
    if (pdfBase64.length > (MAX_PDF_BYTES * 4) / 3) {
      return NextResponse.json(
        { error: 'PDF is too large (max 20MB). Export a shorter date range and try again.' },
        { status: 413 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error:
            'PDF import needs an Anthropic API key. Set the ANTHROPIC_API_KEY environment variable (get a key at console.anthropic.com) and restart the app — or export the statement as CSV instead.',
        },
        { status: 503 }
      );
    }

    const client = new Anthropic();
    const stream = client.messages.stream({
      model: PDF_PARSER_MODEL,
      max_tokens: 64000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
            },
            {
              type: 'text',
              text: `Extract all transactions from this statement ("${filename}"). The account's currency is ${accountCurrency}; use it when the statement does not specify one.`,
            },
          ],
        },
      ],
      output_config: {
        format: { type: 'json_schema', schema: EXTRACTION_SCHEMA },
      },
    });
    const response = await stream.finalMessage();

    if (response.stop_reason === 'refusal') {
      return NextResponse.json(
        { error: 'The model declined to process this PDF. Try a CSV export instead.' },
        { status: 502 }
      );
    }
    if (response.stop_reason === 'max_tokens') {
      return NextResponse.json(
        { error: 'This statement is too long to extract in one pass. Split the PDF or export a CSV instead.' },
        { status: 502 }
      );
    }

    const text = response.content.find(b => b.type === 'text')?.text;
    if (!text) {
      return NextResponse.json({ error: 'No transactions could be extracted from this PDF.' }, { status: 502 });
    }

    const parsed = JSON.parse(text) as {
      transactions: {
        date: string;
        description: string;
        amount: number;
        direction: TransactionDirection;
        currency: string;
        excludeFromFlow: boolean;
      }[];
      warnings: string[];
    };

    const transactions = parsed.transactions
      .filter(t => t.amount > 0 && !isNaN(new Date(t.date).getTime()))
      .map(t => ({
        date: new Date(t.date).toISOString(),
        description: t.description,
        amount: t.amount,
        direction: t.direction,
        currency: t.currency,
        excludeFromFlow: t.excludeFromFlow,
      }));

    return NextResponse.json({ transactions, warnings: parsed.warnings });
  } catch (error: unknown) {
    console.error('PDF parse error:', error);
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: 'The Anthropic API key was rejected. Check ANTHROPIC_API_KEY.' },
        { status: 502 }
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: 'PDF import is rate-limited right now. Try again in a minute.' },
        { status: 502 }
      );
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `PDF import API error: ${error.message}` }, { status: 502 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
