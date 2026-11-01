const crypto = require('node:crypto');
const { unseal } = require('./security');
const db = require('./db');

function getTransactions(userId) {
  return db.prepare('SELECT id, payload_cipher FROM transactions WHERE user_id = ? ORDER BY created_at DESC').all(userId)
    .map(row => ({ id: row.id, ...unseal(row.payload_cipher) }));
}

function getBudgets(userId) {
  return db.prepare('SELECT id, payload_cipher FROM budgets WHERE user_id = ? ORDER BY created_at DESC').all(userId)
    .map(row => ({ id: row.id, ...unseal(row.payload_cipher) }));
}

function dateOnly(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function periodFor(range, from, to) {
  const today = new Date();
  const end = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : dateOnly(today);
  let startDate;
  let days = 30;
  if (range === 'today') days = 1;
  else if (range === '7d') days = 7;
  else if (range === '90d') days = 90;
  else if (range === 'month') {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    days = Math.max(1, Math.ceil((new Date(`${end}T00:00:00`) - startDate) / 86400000) + 1);
  } else if (range === 'custom' && from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    const first = new Date(`${from}T00:00:00`);
    const last = new Date(`${end}T00:00:00`);
    days = Math.max(1, Math.min(366, Math.round((last - first) / 86400000) + 1));
    startDate = first;
  } else days = 30;
  if (!startDate) startDate = new Date(`${end}T00:00:00`);
  if (!(range === 'custom' && from)) startDate.setDate(startDate.getDate() - days + 1);
  const start = dateOnly(startDate);
  const endDate = new Date(`${end}T00:00:00`);
  const previousEndDate = new Date(startDate);
  previousEndDate.setDate(previousEndDate.getDate() - 1);
  const previousStartDate = new Date(previousEndDate);
  previousStartDate.setDate(previousStartDate.getDate() - days + 1);
  return { start, end, days, previousStart: dateOnly(previousStartDate), previousEnd: dateOnly(previousEndDate) };
}

function totalFor(transactions) {
  const income = transactions.reduce((sum, tx) => sum + (tx.amount > 0 ? tx.amount : 0), 0);
  const expenses = transactions.reduce((sum, tx) => sum + (tx.amount < 0 ? Math.abs(tx.amount) : 0), 0);
  return { income: round(income), expenses: round(expenses), net: round(income - expenses), count: transactions.length };
}

function round(value) { return Math.round(value * 100) / 100; }

function percentChange(current, previous) {
  if (!previous) return current ? null : 0;
  return round(((current - previous) / Math.abs(previous)) * 100);
}

function buildDashboard(userId, range = '30d', from, to) {
  const all = getTransactions(userId);
  const budgets = getBudgets(userId);
  const period = periodFor(range, from, to);
  const current = all.filter(tx => tx.date >= period.start && tx.date <= period.end);
  const previous = all.filter(tx => tx.date >= period.previousStart && tx.date <= period.previousEnd);
  const totals = totalFor(current);
  const prevTotals = totalFor(previous);

  const days = [];
  for (let i = 0; i < period.days; i++) {
    const day = new Date(`${period.start}T00:00:00`);
    day.setDate(day.getDate() + i);
    const key = dateOnly(day);
    const txs = current.filter(tx => tx.date === key);
    const dayTotals = totalFor(txs);
    days.push({ date: key, income: dayTotals.income, expenses: dayTotals.expenses, net: dayTotals.net });
  }

  const categoryTotals = new Map();
  const merchantTotals = new Map();
  for (const tx of current.filter(item => item.amount < 0)) {
    const category = tx.category || 'Other';
    categoryTotals.set(category, (categoryTotals.get(category) || 0) + Math.abs(tx.amount));
    const merchant = (tx.description || 'Unknown').slice(0, 54);
    merchantTotals.set(merchant, (merchantTotals.get(merchant) || 0) + Math.abs(tx.amount));
  }
  const categories = [...categoryTotals.entries()].map(([name, value]) => ({ name, value: round(value) })).sort((a, b) => b.value - a.value);
  const merchants = [...merchantTotals.entries()].map(([name, value]) => ({ name, value: round(value) })).sort((a, b) => b.value - a.value).slice(0, 5);

  const now = new Date();
  const monthStart = dateOnly(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthTransactions = all.filter(tx => tx.date >= monthStart && tx.date <= dateOnly(now));
  const monthTotals = totalFor(monthTransactions);
  const budgetProgress = budgets.filter(b => b.period !== 'month' || b.month === monthStart.slice(0, 7)).map(budget => {
    const spent = monthTransactions.filter(tx => tx.amount < 0 && tx.category === budget.category).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    return { ...budget, spent: round(spent), remaining: round(Math.max(0, Number(budget.amount) - spent)), percent: Number(budget.amount) > 0 ? Math.min(100, round((spent / Number(budget.amount)) * 100)) : 0 };
  });

  const expensesChange = percentChange(totals.expenses, prevTotals.expenses);
  const incomeChange = percentChange(totals.income, prevTotals.income);
  const savingsRate = totals.income > 0 ? round((totals.net / totals.income) * 100) : null;

  return {
    range: period,
    totals: { ...totals, savingsRate },
    comparison: {
      expenses: { change: expensesChange, previous: prevTotals.expenses },
      income: { change: incomeChange, previous: prevTotals.income }
    },
    previous: prevTotals,
    daily: days,
    categories,
    merchants,
    budgetProgress,
    recent: [...current].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8),
    transactionCount: all.length,
    allTime: totalFor(all),
    currency: 'INR'
  };
}

function transactionFingerprint(tx) {
  const raw = [tx.date, String(tx.description || '').trim().toLowerCase().replace(/\s+/g, ' '), Number(tx.amount).toFixed(2)].join('|');
  return crypto.createHmac('sha256', process.env.LOOKUP_SECRET || 'missing-lookup-secret').update(raw).digest('hex');
}

module.exports = { getTransactions, getBudgets, buildDashboard, periodFor, totalFor, transactionFingerprint, round };
