import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockStream = vi.hoisted(() => vi.fn());

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = { stream: mockStream };
    static AuthenticationError = class extends Error {};
    static RateLimitError = class extends Error {};
    static APIError = class extends Error {};
  }
  return { default: MockAnthropic };
});

import { POST } from '../route';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest(new URL('/api/parse-pdf', 'http://localhost:3000'), {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

const originalKey = process.env.ANTHROPIC_API_KEY;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = originalKey;
});

describe('POST /api/parse-pdf', () => {
  it('returns 400 when pdfBase64 is missing', async () => {
    const res = await POST(makeRequest({ filename: 'x.pdf' }));
    expect(res.status).toBe(400);
  });

  it('returns 413 when the PDF exceeds the size limit', async () => {
    const res = await POST(makeRequest({ pdfBase64: 'a'.repeat(29 * 1024 * 1024) }));
    const body = await res.json();
    expect(res.status).toBe(413);
    expect(body.error).toContain('too large');
  });

  it('returns 503 with guidance when no API key is configured', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const res = await POST(makeRequest({ pdfBase64: 'JVBERi0=', filename: 'statement.pdf' }));
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body.error).toContain('ANTHROPIC_API_KEY');
    expect(mockStream).not.toHaveBeenCalled();
  });

  it('extracts and normalizes transactions on success', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockStream.mockReturnValue({
      finalMessage: async () => ({
        stop_reason: 'end_turn',
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              transactions: [
                {
                  date: '2026-06-01',
                  description: 'ACME PAYROLL',
                  amount: 5400,
                  direction: 'inflow',
                  currency: 'USD',
                  excludeFromFlow: false,
                },
                {
                  date: 'not-a-date',
                  description: 'BAD ROW',
                  amount: 10,
                  direction: 'outflow',
                  currency: 'USD',
                  excludeFromFlow: false,
                },
                {
                  date: '2026-06-02',
                  description: 'ZERO ROW',
                  amount: 0,
                  direction: 'outflow',
                  currency: 'USD',
                  excludeFromFlow: false,
                },
              ],
              warnings: ['Page 3 was partially unreadable'],
            }),
          },
        ],
      }),
    });

    const res = await POST(
      makeRequest({ pdfBase64: 'JVBERi0=', filename: 'statement.pdf', currency: 'USD' })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.transactions).toHaveLength(1);
    expect(body.transactions[0].description).toBe('ACME PAYROLL');
    expect(body.transactions[0].date).toBe(new Date('2026-06-01').toISOString());
    expect(body.warnings).toEqual(['Page 3 was partially unreadable']);
  });

  it('returns 502 when the model refuses', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockStream.mockReturnValue({
      finalMessage: async () => ({ stop_reason: 'refusal', content: [] }),
    });

    const res = await POST(makeRequest({ pdfBase64: 'JVBERi0=' }));
    expect(res.status).toBe(502);
  });
});
