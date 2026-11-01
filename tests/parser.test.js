const test = require('node:test');
const assert = require('node:assert/strict');
const { rowsToTransactions, normalizeDate, toNumber, inferCategory } = require('../server/statement-parser');

test('statement parser recognises common date, narration, debit and credit headers', () => {
  const result = rowsToTransactions([
    { 'Transaction Date': '01/11/2026', 'Narration': 'Zomato order', 'Debit Amount (INR)': '450.00', 'Credit Amount (INR)': '' },
    { 'Transaction Date': '02/11/2026', 'Narration': 'Monthly salary', 'Debit Amount (INR)': '', 'Credit Amount (INR)': '85000.00' }
  ]);
  assert.equal(result.transactions.length, 2);
  assert.equal(result.transactions[0].date, '2026-11-01');
  assert.equal(result.transactions[0].amount, -450);
  assert.equal(result.transactions[0].category, 'Food & dining');
  assert.equal(result.transactions[1].amount, 85000);
  assert.equal(result.transactions[1].category, 'Income');
});

test('date parser handles ISO, Indian slash dates and Excel serial dates', () => {
  assert.equal(normalizeDate('2026-11-01'), '2026-11-01');
  assert.equal(normalizeDate('5/9/2026'), '2026-09-05');
  assert.equal(normalizeDate(46327), '2026-11-01');
  assert.equal(normalizeDate('31/02/2026'), null);
});

test('amount parser handles Indian currency formatting and parentheses', () => {
  assert.equal(toNumber('₹1,23,456.78'), 123456.78);
  assert.equal(toNumber('(1,250.00)'), -1250);
  assert.equal(toNumber('—'), null);
});

test('description-based category suggestions are deterministic', () => {
  assert.equal(inferCategory('Uber trip', -230), 'Transport');
  assert.equal(inferCategory('Netflix monthly subscription', -199), 'Subscriptions');
  assert.equal(inferCategory('Rent received', 15000), 'Income');
});
