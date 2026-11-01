const HEADER_ALIASES = {
  date: ['date', 'transaction date', 'txn date', 'value date', 'posting date', 'transaction_datetime'],
  description: ['description', 'narration', 'details', 'remarks', 'particulars', 'transaction details', 'transaction description', 'transaction particulars', 'transaction remarks', 'txn description', 'merchant'],
  amount: ['amount', 'transaction amount', 'txn amount', 'value'],
  debit: ['debit', 'withdrawal', 'withdrawals', 'debit amount', 'withdrawal amt', 'withdrawal amount', 'amount debited', 'dr amount', 'paid out'],
  credit: ['credit', 'deposit', 'deposits', 'credit amount', 'deposit amt', 'deposit amount', 'amount credited', 'cr amount', 'paid in'],
  type: ['type', 'dr/cr', 'txn type', 'transaction type', 'debit/credit']
};

function normalizeHeader(value) {
  return String(value ?? '').toLowerCase().replace(/[._-]/g, ' ').replace(/[^a-z0-9/ ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function findColumn(headers, aliases) {
  const normalized = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const needle = normalizeHeader(alias);
    const index = normalized.findIndex(header => header === needle || header.startsWith(`${needle} `));
    if (index >= 0) return headers[index];
  }
  return null;
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  let text = String(value).trim().replace(/[₹$€£,\s]/g, '');
  if (!text || /^[-–—]$/.test(text)) return null;
  const parens = /^\(.*\)$/.test(text);
  text = text.replace(/[()]/g, '').replace(/[A-Za-z]/g, '');
  const number = Number(text);
  if (!Number.isFinite(number)) return null;
  return parens ? -Math.abs(number) : number;
}

function safeDateParts(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function normalizeDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number' && value > 20000 && value < 80000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    excelEpoch.setUTCDate(excelEpoch.getUTCDate() + Math.floor(value));
    return excelEpoch.toISOString().slice(0, 10);
  }
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  let match = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (match) return safeDateParts(Number(match[1]), Number(match[2]), Number(match[3]));
  match = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    let year = Number(match[3]);
    if (year < 100) year += year < 70 ? 2000 : 1900;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return safeDateParts(year, month, day);
    }
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function inferCategory(description, amount) {
  const text = String(description || '').toLowerCase();
  if (amount > 0) return 'Income';
  if (/swiggy|zomato|restaurant|cafe|food|dominos|pizza|starbucks/.test(text)) return 'Food & dining';
  if (/uber|ola|rapido|metro|fuel|petrol|diesel|irctc|bus|flight/.test(text)) return 'Transport';
  if (/amazon|flipkart|myntra|shopping|mall|retail/.test(text)) return 'Shopping';
  if (/netflix|spotify|prime video|youtube premium|hotstar|subscription/.test(text)) return 'Subscriptions';
  if (/electricity|water bill|gas bill|rent|broadband|wifi|recharge|mobile bill/.test(text)) return 'Bills & utilities';
  if (/hospital|pharmacy|medical|clinic|doctor|health/.test(text)) return 'Health';
  if (/school|college|course|udemy|books|education/.test(text)) return 'Education';
  if (/atm|cash withdrawal/.test(text)) return 'Cash';
  if (/salary|interest|refund|cashback|dividend/.test(text)) return 'Income';
  return 'Other';
}

function normalizeRow(row, columns) {
  const date = normalizeDate(row[columns.date]);
  const description = String(row[columns.description] ?? 'Bank transaction').trim().slice(0, 240);
  if (!date || !description) return null;

  let amount = null;
  const debit = columns.debit ? toNumber(row[columns.debit]) : null;
  const credit = columns.credit ? toNumber(row[columns.credit]) : null;
  const type = columns.type ? String(row[columns.type] ?? '').toLowerCase() : '';

  if (debit !== null || credit !== null) {
    const debitValue = debit === null ? 0 : Math.abs(debit);
    const creditValue = credit === null ? 0 : Math.abs(credit);
    if (debitValue > 0 && creditValue > 0) amount = creditValue - debitValue;
    else if (debitValue > 0) amount = -debitValue;
    else if (creditValue > 0) amount = creditValue;
  }
  if (amount === null && columns.amount) {
    const rawAmount = String(row[columns.amount] ?? '');
    amount = toNumber(row[columns.amount]);
    if (amount !== null && (/\b(dr|debit|withdraw|paid out)\b/.test(type) || /\bdr\s*$/.test(rawAmount.toLowerCase()))) amount = -Math.abs(amount);
    if (amount !== null && (/\b(cr|credit|deposit|paid in)\b/.test(type) || /\bcr\s*$/.test(rawAmount.toLowerCase()))) amount = Math.abs(amount);
  }
  if (amount === null || amount === 0) return null;

  return {
    date,
    description,
    amount: Math.round(amount * 100) / 100,
    category: inferCategory(description, amount),
    currency: 'INR',
    source: 'statement'
  };
}

function rowsToTransactions(rows) {
  if (!Array.isArray(rows) || !rows.length) return { transactions: [], warnings: ['No rows were found in this statement.'] };
  const headers = Object.keys(rows[0] || {});
  const columns = Object.fromEntries(Object.entries(HEADER_ALIASES).map(([key, aliases]) => [key, findColumn(headers, aliases)]));
  if (!columns.date || !columns.description || (!columns.amount && !columns.debit && !columns.credit)) {
    return {
      transactions: [],
      warnings: ['Could not identify the required columns. The file needs a date, a description/narration, and an amount or debit/credit column.']
    };
  }
  const transactions = rows.map(row => normalizeRow(row, columns)).filter(Boolean).slice(0, 5000);
  const warnings = [];
  if (transactions.length < rows.length) warnings.push(`${rows.length - transactions.length} rows were skipped because their date, description or amount could not be read.`);
  if (rows.length > 5000) warnings.push('Only the first 5,000 rows were considered.');
  return { transactions, warnings };
}

async function parseStatement(file) {
  const ext = String(file.originalname || '').toLowerCase().split('.').pop();
  if (ext === 'csv') {
    const { parse } = require('csv-parse/sync');
    const rows = parse(file.buffer.toString('utf8'), { columns: true, skip_empty_lines: true, bom: true, trim: true, relax_column_count: true });
    return rowsToTransactions(rows);
  }
  if (ext === 'xlsx') {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) return { transactions: [], warnings: ['The spreadsheet has no worksheets.'] };
    const headerRow = sheet.getRow(1);
    const headers = headerRow.values.slice(1).map((v, i) => String(v ?? `Column ${i + 1}`).trim());
    const rows = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const item = {};
      headers.forEach((header, i) => {
        const cell = row.getCell(i + 1).value;
        item[header] = cell && typeof cell === 'object' && cell.text ? cell.text : cell;
      });
      rows.push(item);
    });
    return rowsToTransactions(rows);
  }
  if (ext === 'pdf') {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(file.buffer);
    const lines = String(data.text || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const transactions = [];
    // Text-based statements often render a table as one transaction per line.
    for (const line of lines) {
      const match = line.match(/^(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})\s+(.+?)\s+([()\-]?\d[\d,]*\.\d{2}[)]?)\s*(DR|CR|DEBIT|CREDIT)?\s*$/i);
      if (!match) continue;
      const date = normalizeDate(match[1]);
      const indicator = String(match[4] || '').toLowerCase();
      let amount = toNumber(match[3]);
      if (/dr|debit/.test(indicator)) amount = -Math.abs(amount);
      if (/cr|credit/.test(indicator)) amount = Math.abs(amount);
      if (date && amount !== null && amount !== 0) {
        transactions.push({ date, description: match[2].slice(0, 240), amount, category: inferCategory(match[2], amount), currency: 'INR', source: 'statement' });
      }
    }
    return {
      transactions: transactions.slice(0, 5000),
      warnings: transactions.length ? ['PDF text was parsed heuristically. Review the preview carefully before importing. Scanned/image-only PDFs are not supported.'] : ['This PDF did not expose a readable transaction table. Export a CSV/XLSX statement from your bank, or use a text-based PDF with one transaction per line.']
    };
  }
  throw new Error('Unsupported file type. Upload a CSV, XLSX or PDF statement.');
}

module.exports = { parseStatement, inferCategory, normalizeDate, toNumber, rowsToTransactions };
