const { getTransactions, buildDashboard, round } = require('./analytics');

const inr = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));

function dateWindow(question) {
  const q = question.toLowerCase();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start = new Date(today);
  let end = new Date(today);
  if (/last month|previous month/.test(q)) {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0);
  } else if (/this month|month to date/.test(q)) {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (/last week|previous week/.test(q)) {
    const day = (today.getDay() + 6) % 7;
    end.setDate(today.getDate() - day - 1);
    start = new Date(end);
    start.setDate(end.getDate() - 6);
  } else if (/this week/.test(q)) {
    const day = (today.getDay() + 6) % 7;
    start.setDate(today.getDate() - day);
  } else if (/today/.test(q)) {
    // today's default window
  } else if (/yesterday/.test(q)) {
    start.setDate(start.getDate() - 1);
    end = new Date(start);
  } else {
    start.setDate(start.getDate() - 29);
  }
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: fmt(start), end: fmt(end), label: /last month|previous month/.test(q) ? 'last month' : /this month|month to date/.test(q) ? 'this month' : /last week|previous week/.test(q) ? 'last week' : /this week/.test(q) ? 'this week' : /today/.test(q) ? 'today' : /yesterday/.test(q) ? 'yesterday' : 'the last 30 days' };
}

function answerLocally(userId, question) {
  const q = question.toLowerCase();
  const all = getTransactions(userId);
  const window = dateWindow(q);
  const txs = all.filter(tx => tx.date >= window.start && tx.date <= window.end);
  const expenses = txs.filter(tx => tx.amount < 0);
  const income = txs.filter(tx => tx.amount > 0);
  const spent = expenses.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const earned = income.reduce((sum, tx) => sum + tx.amount, 0);
  const totalsByCategory = new Map();
  for (const tx of expenses) totalsByCategory.set(tx.category || 'Other', (totalsByCategory.get(tx.category || 'Other') || 0) + Math.abs(tx.amount));
  const sorted = [...totalsByCategory.entries()].sort((a, b) => b[1] - a[1]);
  const largest = [...expenses].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0];
  const avgDaily = spent / Math.max(1, Math.ceil((new Date(`${window.end}T00:00:00`) - new Date(`${window.start}T00:00:00`)) / 86400000) + 1);

  if (!all.length) return 'I do not have any transactions yet. Import a bank statement or add a transaction, then ask me again.';
  if (/largest|biggest|highest single|most expensive transaction/.test(q)) {
    return largest ? `Your largest expense in ${window.label} was ${largest.description} for ${inr(Math.abs(largest.amount))} on ${largest.date}.` : `There are no expenses recorded for ${window.label}.`;
  }
  if (/categor(y|ies)|where.*spend|spend.*most/.test(q)) {
    return sorted.length ? `Your top spending categories for ${window.label}: ${sorted.slice(0, 5).map(([name, value], i) => `${i + 1}. ${name}: ${inr(value)}`).join('; ')}. Your highest category is ${sorted[0][0]}.` : `There is no spending recorded for ${window.label}.`;
  }
  if (/income|earned|salary|received/.test(q)) {
    return `You received ${inr(earned)} across ${income.length} income transaction(s) in ${window.label}.`;
  }
  if (/saving|saved|net/.test(q)) {
    const net = earned - spent;
    const rate = earned > 0 ? round(net / earned * 100) : null;
    return `For ${window.label}, income was ${inr(earned)} and spending was ${inr(spent)}. Your net cash flow was ${inr(net)}${rate === null ? '' : `, a savings rate of ${rate}%`}.`;
  }
  if (/average|daily/.test(q)) {
    return `Your average daily spend in ${window.label} was ${inr(avgDaily)} (based on ${inr(spent)} total spending).`;
  }
  if (/subscription|recurring/.test(q)) {
    const matches = expenses.filter(tx => /subscription|netflix|spotify|prime video|hotstar|youtube premium|monthly plan|autopay/.test(`${tx.description} ${tx.category}`.toLowerCase()));
    const total = matches.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    return matches.length ? `I found ${matches.length} possible subscription or recurring-payment transaction(s) in ${window.label}, totalling ${inr(total)}. Check the transaction descriptions to confirm which are recurring.` : `I could not identify likely subscription payments in ${window.label}. This is based on matching transaction descriptions, so some subscriptions may be missed.`;
  }
  if (/merchant|shop|store|paid to/.test(q)) {
    const words = q.split(/\s+/).filter(word => word.length > 3 && !['merchant', 'shop', 'store', 'paid', 'what', 'have', 'spent', 'with', 'from', 'this', 'month'].includes(word));
    const matches = expenses.filter(tx => words.some(word => tx.description.toLowerCase().includes(word)));
    const total = matches.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    return matches.length ? `I found ${matches.length} matching expense(s) totalling ${inr(total)}: ${matches.slice(0, 4).map(tx => `${tx.description} (${inr(Math.abs(tx.amount))})`).join(', ')}.` : 'I could not find a matching merchant in your transactions for that period.';
  }
  const dashboard = buildDashboard(userId, '30d');
  const top = dashboard.categories.slice(0, 3).map(item => `${item.name} (${inr(item.value)})`).join(', ');
  return `Here is your ${window.label} snapshot: you spent ${inr(spent)}, received ${inr(earned)}, and had net cash flow of ${inr(earned - spent)} across ${txs.length} transactions. ${top ? `Your leading expense categories in the last 30 days are ${top}.` : 'There is not enough category data yet.'} Try asking “Where did I spend the most this month?”, “What was my biggest expense?”, or “How much income did I receive last week?”.`;
}

async function answerQuestion(userId, question) {
  const fallback = answerLocally(userId, question);
  const ollamaUrl = (process.env.OLLAMA_URL || '').trim().replace(/\/$/, '');
  if (!ollamaUrl) return { answer: fallback, mode: 'private-insights' };

  try {
    const dashboard = buildDashboard(userId, '30d');
    const summary = {
      period: 'last 30 days',
      income: dashboard.totals.income,
      expenses: dashboard.totals.expenses,
      net: dashboard.totals.net,
      savingsRate: dashboard.totals.savingsRate,
      categories: dashboard.categories.slice(0, 8),
      topMerchants: dashboard.merchants.slice(0, 5),
      transactionCount: dashboard.totals.count
    };
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || 'llama3.2:3b',
        stream: false,
        messages: [
          { role: 'system', content: 'You are Moneyglass, a careful personal-finance insights assistant. Answer only from the supplied aggregate transaction summary. State when the data is insufficient. Never invent a number. Do not give investment, tax, legal, or credit advice. Currency is INR. Keep answers concise.' },
          { role: 'user', content: `My spending summary: ${JSON.stringify(summary)}\nQuestion: ${question}` }
        ],
        options: { temperature: 0.2 }
      })
    });
    if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
    const data = await response.json();
    const answer = String(data?.message?.content || '').trim();
    if (!answer) throw new Error('Empty response');
    return { answer, mode: 'local-model' };
  } catch (error) {
    return { answer: `${fallback}\n\nYour local language model could not be reached, so I used the private built-in insights engine.`, mode: 'private-insights' };
  }
}

module.exports = { answerQuestion, answerLocally };
