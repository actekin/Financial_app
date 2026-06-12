'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import { Bank, Currency, Account, TransactionDirection, getBankLabel } from '@/types';
import { Upload, FileText, CheckCircle, AlertCircle, X, ChevronDown, ChevronRight } from 'lucide-react';

interface ParsedRow {
  date: string;
  description: string;
  amount: number;
  direction: TransactionDirection;
  currency: string;
  excludeFromFlow: boolean;
}

interface FileEntry {
  id: number;
  filename: string;
  rawRows: Record<string, string>[];
  headers: string[];
  accountId: number | null;
  parsedRows: ParsedRow[];
  parseError: string | null;
  result: { imported: number; skipped: number } | null;
  uploadError: string | null;
  expanded: boolean;
}

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

let nextFileId = 1;

export default function UploadPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [defaultAccountId, setDefaultAccountId] = useState<number | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetch('/api/accounts')
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setAccounts(data); })
      .catch(() => {});
  }, []);

  function parseForAccount(entry: FileEntry, accountId: number | null): FileEntry {
    const account = accounts.find(a => a.id === accountId);
    const currency = (account?.currency || Currency.USD) as Currency;
    const bank = account?.bank as Bank;
    try {
      const parsedRows = parseCSVRows(entry.rawRows, entry.headers, bank, currency);
      return { ...entry, accountId, parsedRows, parseError: parsedRows.length === 0 ? 'No usable transactions found in this file.' : null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown parse error';
      return { ...entry, accountId, parsedRows: [], parseError: msg };
    }
  }

  const handleFiles = useCallback(async (incoming: File[]) => {
    for (const f of incoming) {
      const text = await f.text();
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete(results) {
          const rows = results.data as Record<string, string>[];
          const base: FileEntry = {
            id: nextFileId++,
            filename: f.name,
            rawRows: rows,
            headers: rows.length > 0 ? Object.keys(rows[0]) : [],
            accountId: defaultAccountId,
            parsedRows: [],
            parseError: null,
            result: null,
            uploadError: null,
            expanded: false,
          };

          let entry: FileEntry;
          if (results.errors.length > 0 && rows.length === 0) {
            entry = { ...base, parseError: `Parse error: ${results.errors[0].message}` };
          } else if (rows.length === 0) {
            entry = { ...base, parseError: 'No data rows found in file.' };
          } else {
            entry = parseForAccount(base, defaultAccountId);
          }
          setFiles(prev => [...prev, entry]);
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultAccountId, accounts]);

  function setFileAccount(fileId: number, accountId: number | null) {
    setFiles(prev => prev.map(f => (f.id === fileId ? parseForAccount(f, accountId) : f)));
  }

  function removeFile(fileId: number) {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }

  function toggleExpanded(fileId: number) {
    setFiles(prev => prev.map(f => (f.id === fileId ? { ...f, expanded: !f.expanded } : f)));
  }

  const pendingFiles = files.filter(f => !f.result && !f.parseError && f.parsedRows.length > 0);
  const readyFiles = pendingFiles.filter(f => f.accountId !== null);
  const totalReadyRows = readyFiles.reduce((sum, f) => sum + f.parsedRows.length, 0);

  async function handleImportAll() {
    setUploading(true);
    for (const entry of readyFiles) {
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId: entry.accountId,
            filename: entry.filename,
            transactions: entry.parsedRows,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setFiles(prev => prev.map(f =>
            f.id === entry.id ? { ...f, uploadError: data.error || 'Import failed.' } : f
          ));
        } else {
          setFiles(prev => prev.map(f => (f.id === entry.id ? { ...f, result: data, uploadError: null } : f)));
        }
      } catch {
        setFiles(prev => prev.map(f =>
          f.id === entry.id ? { ...f, uploadError: 'Import failed. Please try again.' } : f
        ));
      }
    }
    setUploading(false);
  }

  const importedFiles = files.filter(f => f.result);
  const totalImported = importedFiles.reduce((s, f) => s + (f.result?.imported ?? 0), 0);
  const totalSkipped = importedFiles.reduce((s, f) => s + (f.result?.skipped ?? 0), 0);

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-white mb-2">Upload Statements</h1>
      <p className="text-gray-400 text-sm mb-8">
        Import CSV bank statements — drop several files at once and assign each to an account.
        Re-uploading overlapping statements is safe: duplicates are skipped automatically.
      </p>

      {/* Step 1: Default Account */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">1. Default Account (applied to newly added files)</label>
        {accounts.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-sm">
              No accounts found. <a href="/accounts" className="text-blue-400 hover:underline">Add an account first</a>.
            </p>
          </div>
        ) : (
          <select
            value={defaultAccountId || ''}
            onChange={e => setDefaultAccountId(e.target.value ? parseInt(e.target.value) : null)}
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

      {/* Step 2: Upload Files */}
      {accounts.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">2. Add CSV Files</label>
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={e => {
              e.preventDefault();
              setIsDragging(false);
              handleFiles(Array.from(e.dataTransfer.files));
            }}
            className={`
              border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer
              ${isDragging ? 'border-blue-500 bg-blue-950/20' : 'border-gray-700 hover:border-gray-600 bg-gray-900/50'}
            `}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.csv';
              input.multiple = true;
              input.onchange = (e) => {
                const fileList = (e.target as HTMLInputElement).files;
                if (fileList) handleFiles(Array.from(fileList));
              };
              input.click();
            }}
          >
            <Upload className="w-8 h-8 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Drag and drop CSV files (multiple allowed), or click to browse</p>
            <p className="text-gray-600 text-xs mt-1">Supports Bank of America, Chase, Lloyds, HSBC, Amex, QNB Finansbank, Revolut, Trading 212</p>
          </div>
        </div>
      )}

      {/* Step 3: File queue */}
      {files.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-300">
              3. Review &amp; Import ({files.length} file{files.length > 1 ? 's' : ''})
            </label>
            {readyFiles.length > 0 && (
              <button
                onClick={handleImportAll}
                disabled={uploading}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors"
              >
                {uploading
                  ? 'Importing...'
                  : `Import ${readyFiles.length} File${readyFiles.length > 1 ? 's' : ''} (${totalReadyRows} transactions)`}
              </button>
            )}
          </div>

          <div className="space-y-3">
            {files.map(entry => (
              <div key={entry.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => toggleExpanded(entry.id)}
                    className="text-gray-500 hover:text-gray-300"
                    disabled={entry.parsedRows.length === 0}
                  >
                    {entry.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <FileText className="w-5 h-5 text-blue-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-white truncate">{entry.filename}</div>
                    <div className="text-xs text-gray-500">
                      {entry.parseError
                        ? <span className="text-red-400">{entry.parseError}</span>
                        : `${entry.parsedRows.length} transactions parsed`}
                    </div>
                  </div>

                  {!entry.result && !entry.parseError && (
                    <select
                      value={entry.accountId || ''}
                      onChange={e => setFileAccount(entry.id, e.target.value ? parseInt(e.target.value) : null)}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white"
                    >
                      <option value="">Assign account...</option>
                      {accounts.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.currency})
                        </option>
                      ))}
                    </select>
                  )}

                  {entry.result && (
                    <span className="flex items-center gap-1.5 text-xs text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      {entry.result.imported} imported, {entry.result.skipped} skipped
                    </span>
                  )}
                  {entry.uploadError && (
                    <span className="flex items-center gap-1.5 text-xs text-red-400">
                      <AlertCircle className="w-4 h-4" /> {entry.uploadError}
                    </span>
                  )}

                  <button
                    onClick={() => removeFile(entry.id)}
                    className="text-gray-500 hover:text-gray-300"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {entry.expanded && entry.parsedRows.length > 0 && (
                  <div className="border-t border-gray-800 overflow-x-auto max-h-72 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-800/50 sticky top-0">
                        <tr>
                          <th className="text-left px-4 py-2 text-gray-400 font-medium">Date</th>
                          <th className="text-left px-4 py-2 text-gray-400 font-medium">Description</th>
                          <th className="text-right px-4 py-2 text-gray-400 font-medium">Amount</th>
                          <th className="text-center px-4 py-2 text-gray-400 font-medium">Currency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entry.parsedRows.slice(0, 50).map((row, i) => (
                          <tr key={i} className="border-t border-gray-800/50">
                            <td className="px-4 py-1.5 text-gray-300 whitespace-nowrap">
                              {new Date(row.date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-1.5 text-gray-300 max-w-xs truncate">
                              {row.description}
                              {row.excludeFromFlow && (
                                <span className="ml-2 text-xs text-yellow-500">(trade — excluded from flow)</span>
                              )}
                            </td>
                            <td className={`px-4 py-1.5 text-right font-mono tabular-nums ${
                              row.direction === TransactionDirection.INFLOW ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {row.direction === TransactionDirection.INFLOW ? '+' : '-'}
                              {row.amount.toFixed(2)}
                            </td>
                            <td className="px-4 py-1.5 text-center text-gray-500">{row.currency}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {entry.parsedRows.length > 50 && (
                      <p className="px-4 py-2 text-xs text-gray-500 border-t border-gray-800">
                        Showing first 50 of {entry.parsedRows.length} transactions
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overall result */}
      {importedFiles.length > 0 && importedFiles.length === files.length && (
        <div className="bg-green-950/30 border border-green-900 rounded-xl p-6 flex items-start gap-4">
          <CheckCircle className="w-6 h-6 text-green-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-green-300 font-semibold mb-1">All Imports Complete</h3>
            <p className="text-sm text-green-400/80">
              {totalImported} transactions imported across {importedFiles.length} file{importedFiles.length > 1 ? 's' : ''}, {totalSkipped} duplicates skipped.
            </p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setFiles([])}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
              >
                Upload More
              </button>
              <Link
                href="/quick-update"
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded-lg transition-colors inline-block"
              >
                Update Balances
              </Link>
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
