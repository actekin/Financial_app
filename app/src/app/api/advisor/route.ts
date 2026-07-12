import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildFinancialContext, FinancialContext } from '@/lib/advisor/analysis';
import { fromCents } from '@/lib/utils/money';

const ADVISOR_MODEL = process.env.ADVISOR_MODEL || 'claude-opus-4-8';

export const CHART_KEYS = [
  'monthly_trend',
  'income_vs_spending',
  'category_compare',
  'cash_position',
  'goal_progress',
] as const;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    verdict: {
      type: 'string',
      enum: ['yes', 'no', 'caution', 'info'],
      description: 'yes = go for it, no = hold off, caution = possible but tight, info = informational answer',
    },
    headline: { type: 'string', description: 'One-sentence direct answer to the question' },
    reasoning: {
      type: 'string',
      description: 'Two to five plain-language sentences citing the specific numbers that support the verdict',
    },
    chartKeys: {
      type: 'array',
      items: { type: 'string', enum: [...CHART_KEYS] },
      description: '1-3 charts that best support this analysis, most relevant first',
    },
  },
  required: ['verdict', 'headline', 'reasoning', 'chartKeys'],
  additionalProperties: false,
} as const;

function money(cents: number, currency: string): string {
  return `${currency} ${fromCents(cents).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Render the context as readable text with amounts in major units so the model
// never has to do cents arithmetic.
function formatContextForPrompt(ctx: FinancialContext): string {
  const c = ctx.primaryCurrency;
  const lines: string[] = [];

  lines.push(`Snapshot generated: ${ctx.generatedAt.slice(0, 10)}`);
  lines.push(`Primary currency (largest spending volume): ${c}`);

  lines.push('\n== Cash position ==');
  for (const [cur, total] of Object.entries(ctx.cash.totalByCurrency)) {
    lines.push(`Total across ${cur} accounts: ${money(total, cur)}`);
  }
  for (const a of ctx.cash.accounts) {
    lines.push(`- ${a.name} (${a.bank}, ${a.type}): ${money(a.balance, a.currency)}`);
  }

  lines.push(`\n== Monthly cash flow, ${c} (last 12 full months + current) ==`);
  for (const m of ctx.monthly) {
    lines.push(`${m.month}: income ${money(m.income, c)}, spending ${money(m.spending, c)}, net ${money(m.net, c)}`);
  }

  const cm = ctx.currentMonth;
  lines.push(`\n== Current month (${cm.month}, day ${cm.dayOfMonth} of ${cm.daysInMonth}) ==`);
  lines.push(`Spent so far: ${money(cm.spending, c)}`);
  lines.push(`Typical spend by day ${cm.dayOfMonth} in past months: ${money(cm.avgSpendingToSameDay, c)}`);
  if (cm.spendingVsAvgPct !== null) {
    lines.push(
      `So the household is tracking ${cm.spendingVsAvgPct >= 0 ? '+' : ''}${cm.spendingVsAvgPct}% vs a typical month at this point.`
    );
  }
  lines.push(`Projected full-month spending at this pace: ${money(cm.projectedSpending, c)}`);
  lines.push(`Trailing 12-month average full-month spending: ${money(cm.avgMonthlySpending, c)}`);
  lines.push(`Trailing 12-month average income: ${money(cm.avgMonthlyIncome, c)}`);

  if (ctx.categories.length > 0) {
    lines.push(`\n== Spending by category, ${c} (this month vs monthly average) ==`);
    for (const cat of ctx.categories) {
      lines.push(`${cat.label}: this month ${money(cat.thisMonth, c)}, average ${money(cat.monthlyAverage, c)}/month`);
    }
  }

  if (ctx.largestExpensesThisMonth.length > 0) {
    lines.push('\n== Largest expenses this month ==');
    for (const e of ctx.largestExpensesThisMonth) {
      lines.push(`${e.date}: ${e.description} — ${money(e.amount, c)} (${e.category})`);
    }
  }

  if (ctx.goals.length > 0) {
    lines.push('\n== Savings goals ==');
    for (const g of ctx.goals) {
      const parts = [
        `${g.emoji ? `${g.emoji} ` : ''}${g.name}: ${money(g.savedAmount, g.currency)} of ${money(g.targetAmount, g.currency)} (${g.progressPct}%)`,
      ];
      if (g.targetDate) parts.push(`target date ${g.targetDate}`);
      if (g.requiredMonthlySaving !== null && g.requiredMonthlySaving > 0) {
        parts.push(`needs ${money(g.requiredMonthlySaving, g.currency)}/month to stay on track`);
      }
      lines.push(`- ${parts.join(', ')}`);
    }
  } else {
    lines.push('\n== Savings goals ==\nNo savings goals set yet.');
  }

  return lines.join('\n');
}

const SYSTEM_PROMPT = `You are FinFlow's household financial advisor for a couple. You answer money questions using ONLY the financial snapshot provided — real balances, real spending history, real savings goals.

How to answer:
- Be direct and specific. Lead with the decision, then justify it with the actual numbers (cite amounts and percentages from the snapshot).
- Judge affordability against: cash position, how this month's spending compares to the trailing average, upcoming savings-goal commitments, and typical monthly net savings.
- A discretionary splurge is fine when the month is tracking under average and goals are on track; push back when the household is already overspending or a goal would slip.
- Money is a team sport: phrase advice for the household ("you two", "your"), never lecture.
- If the snapshot lacks the data to answer (no transactions, missing months), say so plainly and suggest what to upload.
- Never invent numbers that are not in the snapshot. Currency amounts in your text must include the currency symbol or code.
- Pick 1-3 chartKeys that best visualise your reasoning: monthly_trend (spending by month vs average), income_vs_spending (both flows by month), category_compare (this month vs average by category), cash_position (balances per account), goal_progress (savings goals).`;

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    const context = await buildFinancialContext();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error:
            'The advisor needs an Anthropic API key. Set the ANTHROPIC_API_KEY environment variable (get a key at console.anthropic.com) and restart the app.',
          context,
        },
        { status: 503 }
      );
    }

    const history: ChatTurn[] = Array.isArray(body.history)
      ? body.history
          .filter(
            (t: ChatTurn) =>
              t && (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string'
          )
          .slice(-10)
      : [];

    const client = new Anthropic();
    const response = await client.messages.create({
      model: ADVISOR_MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      system: `${SYSTEM_PROMPT}\n\n<financial_snapshot>\n${formatContextForPrompt(context)}\n</financial_snapshot>`,
      messages: [...history, { role: 'user' as const, content: question }],
      output_config: {
        format: { type: 'json_schema', schema: RESPONSE_SCHEMA },
      },
    });

    if (response.stop_reason === 'refusal') {
      return NextResponse.json(
        { error: 'The advisor declined to answer this question. Try rephrasing it.', context },
        { status: 502 }
      );
    }

    const text = response.content.find(b => b.type === 'text')?.text;
    if (!text) {
      return NextResponse.json({ error: 'The advisor returned an empty answer.', context }, { status: 502 });
    }

    const advice = JSON.parse(text);
    return NextResponse.json({ advice, context });
  } catch (error: unknown) {
    console.error('Advisor error:', error);
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: 'The Anthropic API key was rejected. Check ANTHROPIC_API_KEY.' },
        { status: 502 }
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: 'The advisor is rate-limited right now. Try again in a minute.' },
        { status: 502 }
      );
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `Advisor API error: ${error.message}` }, { status: 502 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
