const { parseNote } = require('../services/smartParser');

describe('smartParser — multi-item extraction', () => {
  test('splits the spec\'s final demo scenario into 4 correctly-routed records', () => {
    const text = '18 September ko electricity bill ₹1200 bharna hai. Friday ko 5 PM project meeting hai. '
      + '20 October ko bike insurance expire hai. Aaj food pe ₹350 spend kiya.';

    const items = parseNote(text);
    expect(items).toHaveLength(4);

    const finance = items.filter((i) => i.module === 'finance');
    const personal = items.filter((i) => i.module === 'personal');
    const documents = items.filter((i) => i.module === 'documents');

    expect(personal).toHaveLength(1);
    expect(finance).toHaveLength(2);
    expect(documents).toHaveLength(1);

    expect(personal[0].category).toBe('Meeting');
    expect(personal[0].time).toBe('5:00 PM');

    expect(finance.find((f) => f.category === 'Utilities').amount).toBe(1200);
    expect(finance.find((f) => f.category === 'Food').amount).toBe(350);

    expect(documents[0].category).toBe('Insurance');
    expect(documents[0].dateLabel).toMatch(/October/);
  });

  test('never guesses a date when none is given', () => {
    const items = parseNote('Buy groceries.');
    expect(items).toHaveLength(1);
    expect(items[0].date).toBeNull();
    expect(items[0].dateLabel).toBe('Not specified');
  });

  test('detects Hindi recurring pattern "Har Sunday"', () => {
    const items = parseNote('Har Sunday grocery shopping karni hai.');
    expect(items).toHaveLength(1);
    expect(items[0].recurring).toBe(true);
    expect(items[0].frequency).toBe('weekly');
    expect(items[0].module).toBe('personal');
  });

  test('detects English recurring pattern "every month"', () => {
    const items = parseNote('Pay internet bill every month.');
    expect(items[0].recurring).toBe(true);
    expect(items[0].frequency).toBe('monthly');
  });

  test('routes money + finance keyword to finance, not personal', () => {
    const items = parseNote('Spent ₹500 on shopping today.');
    expect(items).toHaveLength(1);
    expect(items[0].module).toBe('finance');
    expect(items[0].type).toBe('expense');
    expect(items[0].amount).toBe(500);
    expect(items[0].category).toBe('Shopping');
  });

  test('routes salary/income correctly and keeps it out of expense totals', () => {
    const items = parseNote('30 September ko salary ₹35000 milegi.');
    expect(items[0].module).toBe('finance');
    expect(items[0].type).toBe('income');
    expect(items[0].amount).toBe(35000);
  });

  test('routes insurance/warranty/expiry language to documents', () => {
    const items = parseNote('Bike insurance 20 October ko expire hai aur laptop warranty December tak hai.');
    expect(items).toHaveLength(2);
    expect(items.every((i) => i.module === 'documents')).toBe(true);
    expect(items[0].category).toBe('Insurance');
    expect(items[1].category).toBe('Warranty');
  });

  test('assigns high priority to items due today/tomorrow, low priority to far-out items', () => {
    const items = parseNote('Submit report today. Renew passport next year.');
    const today = items.find((i) => /report/i.test(i.title));
    expect(today.priority).toBe('high');
  });

  test('extracts amounts in multiple formats', () => {
    expect(parseNote('Paid Rs 500 for food.')[0].amount).toBe(500);
    expect(parseNote('Paid 500 rupees for food.')[0].amount).toBe(500);
    expect(parseNote('Paid ₹1,200 for food.')[0].amount).toBe(1200);
  });

  test('returns an empty array for blank input', () => {
    expect(parseNote('')).toEqual([]);
    expect(parseNote('   ')).toEqual([]);
  });
});
