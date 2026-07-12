'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import { Bank, Currency, Account, TransactionDirection, getBankLabel } from '@/types';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';

interface ParsedRow {
  date: string;
  description: string;
  amount: number;
  direction: TransactionDirection;
  currency: string;
  excludeFromFlow: boolean;
}

export default function UploadPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetch('/api/accounts')
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setAccounts(data); })
      .catch(() => {});
  }, []);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setResult(null);
    setParseError(null);
    setParsedRows([]);

    const text = await f.text();

    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        if (results.errors.length > 0 && results.data.length === 0) {
          setParseError(`Parse error: ${results.errors[0].message}`);
          return;
        }

        const rows = results.data as Record<string, string>[];
        if (rows.length === 0) {
          setParseError('No data rows found in file.');
          return;
        }

        // Auto-detect parser based on headers
        const headers = Object.keys(rows[0]);
        const account = accounts.find(a => a.id === selectedAccountId);
        const currency = account?.currency || Currency.USD;
        const bank = account?.bank as Bank;

        try {
          const parsed = parseCSVRows(rows, headers, bank, currency);
          setParsedRows(parsed);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Unknown parse error';
          setParseError(msg);
        }
      },
    });
  }, [selectedAccountId, accounts]);

  function parseCSVRows(
    rows: Record<string, string>[],
    headers: string[],
    bank: Bank,
    currency: Currency
  ): ParsedRow[] {
    const lower = headers.map(h => h.toLowerCase().trim());

    return rows.map(row => {
      // Find date column
      const dateKey = headers.find((_, i) =>
        ['date', 'tarih', 'transaction date', 'date started', 'date completed', 'time', 'işlem tarihi']
          .includes(lower[i])
      );
      const dateStr = dateKey ? row[dateKey] : '';

      // Parse date
      let date: Date;
      try {
        // Try various formats
        if (dateStr.includes('/')) {
          const parts = dateStr.split('/');
          if (bank === Bank.LLOYDS || bank === Bank.HSBC || bank === Bank.AMEX || bank === Bank.REVOLUT) {
            // DD/MM/YYYY
            date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          } else {
            // MM/DD/YYYY
            date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
          }
        } else if (dateStr.includes('.')) {
          const parts = dateStr.split('.');
          date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        } else {
          date = new Date(dateStr);
        }
      } catch {
        date = new Date(dateStr);
      }

      if (isNaN(date.getTime())) {
        date = new Date();
      }

      // Find description
      const descKey = headers.find((_, i) =>
        ['description', 'details', 'memo', 'açıklama', 'transaction description', 'name', 'işlem açıklaması']
          .includes(lower[i])
      );
      const description = descKey ? row[descKey] : '';

      // Find amount
      let amount = 0;
      let direction = TransactionDirection.OUTFLOW;
      let excludeFromFlow = false;

      // Trading 212 special handling
      if (bank === Bank.TRADING_212) {
        const action = (row['Action'] || row['action'] || '').toLowerCase();
        const totalKey = headers.find((_, i) => ['total', 'result'].includes(lower[i]));
        const rawAmt = totalKey ? parseFloat(row[totalKey]?.replace(/[^0-9.-]/g, '') || '0') : 0;
        amount = Math.abs(rawAmt);

        if (action.includes('deposit')) {
          direction = TransactionDirection.INFLOW;
        } else if (action.includes('withdrawal')) {
          direction = TransactionDirection.OUTFLOW;
        } else if (action.includes('dividend')) {
          direction = TransactionDirection.INFLOW;
        } else {
          // Market buy/sell — exclude from flow
          direction = action.includes('buy') ? TransactionDirection.OUTFLOW : TransactionDirection.INFLOW;
          excludeFromFlow = true;
        }
      } else {
        // Check for single Amount column
        const amtKey = headers.find((_, i) => lower[i] === 'amount' || lower[i] === 'tutar');
        // Check for split columns
        const debitKey = headers.find((_, i) =>
          ['debit', 'money out', 'money out (£)', 'paid out', 'borç', 'çıkış'].includes(lower[i])
        );
        const creditKey = headers.find((_, i) =>
          ['credit', 'money in', 'money in (£)', 'paid in', 'alacak', 'giriş'].includes(lower[i])
        );

        if (amtKey) {
          let raw = row[amtKey] || '0';
          // Handle Turkish number format (1.234,56)
          if (raw.includes(',') && raw.includes('.') && raw.indexOf('.') < raw.indexOf(',')) {
            raw = raw.replace(/\./g, '').replace(',', '.');
          }
          const val = parseFloat(raw.replace(/[^0-9.-]/g, '') || '0');
          direction = val < 0 ? TransactionDirection.OUTFLOW : TransactionDirection.INFLOW;
          amount = Math.abs(val);
        } else if (debitKey || creditKey) {
          const debit = debitKey ? Math.abs(parseFloat(row[debitKey]?.replace(/[^0-9.-]/g, '') || '0')) : 0;
          const credit = creditKey ? Math.abs(parseFloat(row[creditKey]?.replace(/[^0-9.-]/g, '') || '0')) : 0;
          if (credit > 0) {
            amount = credit;
            direction = TransactionDirection.INFLOW;
          } else {
            amount = debit;
            direction = TransactionDirection.OUTFLOW;
          }
        }
      }

      // Use currency from CSV if available (Revolut)
      const currKey = headers.find((_, i) => lower[i] === 'currency');
      const txCurrency = currKey && row[currKey] && Object.values(Currency).includes(row[currKey] as Currency)
        ? row[currKey]
        : currency;

      return {
        date: date.toISOString(),
        description,
        amount,
        direction,
        currency: txCurrency,
        excludeFromFlow,
      };
    }).filter(r => r.amount > 0);
  }

  async function handleUpload() {
    if (!selectedAccountId || parsedRows.length === 0) return;

    setUploading(true);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selectedAccountId,
          filename: file?.name || 'upload.csv',
          transactions: parsedRows,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setParseError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-white tracking-tight mb-1">Upload Statements</h1>
      <p className="text-gray-500 text-sm mb-8">Import CSV bank statements to keep your data fresh — duplicates are skipped automatically</p>

      {/* Step 1: Select Account */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">1. Select Account</label>
        {accounts.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-sm">
              No accounts found. <a href="/accounts" className="text-blue-400 hover:underline">Add an account first</a>.
            </p>
          </div>
        ) : (
          <select
            value={selectedAccountId || ''}
            onChange={e => setSelectedAccountId(parseInt(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white w-full max-w-md"
          >
            <option value="">Choose an account...</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>
                {a.name} ({getBankLabel(a.bank)} · {a.currency})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Step 2: Upload File */}
      {selectedAccountId && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">2. Upload CSV File</label>
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer
              ${isDragging ? 'border-blue-500 bg-blue-950/20' : 'border-gray-700 hover:border-gray-600 bg-gray-900/50'}
            `}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.csv';
              input.onchange = (e) => {
                const f = (e.target as HTMLInputElement).files?.[0];
                if (f) handleFile(f);
              };
              input.click();
            }}
          >
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-6 h-6 text-blue-400" />
                <span className="text-white font-medium">{file.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); setParsedRows([]); setResult(null); }}
                  className="text-gray-500 hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Drag and drop a CSV file, or click to browse</p>
                <p className="text-gray-600 text-xs mt-1">Supports Bank of America, Chase, Lloyds, HSBC, QNB Finansbank, Revolut, Trading 212</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Parse Error */}
      {parseError && (
        <div className="mb-6 bg-red-950/30 border border-red-900 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{parseError}</p>
        </div>
      )}

      {/* Step 3: Preview */}
      {parsedRows.length > 0 && !result && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-300">
              3. Preview ({parsedRows.length} transactions)
            </label>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors"
            >
              {uploading ? 'Importing...' : `Import ${parsedRows.length} Transactions`}
            </button>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/50 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-gray-400 font-medium">Date</th>
                    <th className="text-left px-4 py-2.5 text-gray-400 font-medium">Description</th>
                    <th className="text-right px-4 py-2.5 text-gray-400 font-medium">Amount</th>
                    <th className="text-center px-4 py-2.5 text-gray-400 font-medium">Direction</th>
                    <th className="text-center px-4 py-2.5 text-gray-400 font-medium">Currency</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 100).map((row, i) => (
                    <tr key={i} className="border-t border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-2 text-gray-300 whitespace-nowrap">
                        {new Date(row.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-gray-300 max-w-xs truncate">
                        {row.description}
                        {row.excludeFromFlow && (
                          <span className="ml-2 text-xs text-yellow-500">(trade — excluded from flow)</span>
                        )}
                      </td>
                      <td className={`px-4 py-2 text-right font-mono tabular-nums ${
                        row.direction === TransactionDirection.INFLOW ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {row.direction === TransactionDirection.INFLOW ? '+' : '-'}
                        {row.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs ${
                          row.direction === TransactionDirection.INFLOW
                            ? 'bg-green-950 text-green-400'
                            : 'bg-red-950 text-red-400'
                        }`}>
                          {row.direction}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center text-gray-500">{row.currency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedRows.length > 100 && (
                <p className="px-4 py-3 text-xs text-gray-500 border-t border-gray-800">
                  Showing first 100 of {parsedRows.length} transactions
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Result */}
      {result && (
        <div className="bg-green-950/30 border border-green-900 rounded-xl p-6 flex items-start gap-4">
          <CheckCircle className="w-6 h-6 text-green-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-green-300 font-semibold mb-1">Import Complete</h3>
            <p className="text-sm text-green-400/80">
              {result.imported} transactions imported, {result.skipped} duplicates skipped.
            </p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => { setFile(null); setParsedRows([]); setResult(null); }}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
              >
                Upload Another
              </button>
              <Link
                href="/"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors inline-block"
              >
                View Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
