/**
 * smartParser.js
 * Rule-based extraction engine that turns a free-form note (English/Hindi/Hinglish)
 * into one or more structured records, each tagged with a module (personal | finance | documents).
 *
 * This is intentionally deterministic (no external AI call) so it works fully offline.
 */

const MONTHS = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8,
  september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

const WEEKDAYS = {
  sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3, thursday: 4, thu: 4, thurs: 4, friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

const DAY_PART_TIMES = {
  morning: '9:00 AM',
  afternoon: '2:00 PM',
  evening: '6:00 PM',
  night: '9:00 PM',
};

const RECURRING_WORDS = /\b(daily|weekly|monthly|yearly|annually|(?:every|har)\s+(?:day|week|month|year|roz|din|hafte|mahina|mahine|saal|sunday|monday|tuesday|wednesday|thursday|friday|saturday))\b/i;

const PERSONAL_KEYWORDS = [
  'task', 'todo', 'to-do', 'assignment', 'meeting', 'appointment', 'project',
  'call', 'study', 'plan', 'submit', 'submission', 'event', 'reminder to',
  'dentist', 'doctor', 'exam', 'interview', 'deadline', 'visit',
];

// Filler/action phrases used only to help recognise a clause as "personal" in tone,
// never used as a category label (that would produce categories like "Karna Hai").
const PERSONAL_FILLER_PHRASES = ['karna hai', 'karni hai', 'jana hai'];

const FINANCE_KEYWORDS = [
  'salary', 'income', 'expense', 'spent', 'received', 'bill', 'payment', 'pay',
  'subscription', 'shopping', 'food', 'travel', 'rent', 'grocery', 'groceries',
  'recharge', 'emi', 'loan', 'electricity', 'internet bill', 'paid', 'bharna hai', 'kharch',
];

const DOCUMENT_KEYWORDS = [
  'insurance', 'expiry', 'expire', 'expires', 'renew', 'renewal', 'rc', 'license',
  'licence', 'warranty', 'service', 'vehicle', 'document', 'aadhaar', 'pan card',
  'passport', 'driving license', 'certificate', 'pollution certificate',
];

const FINANCE_CATEGORY_MAP = {
  salary: 'Salary', income: 'Income', received: 'Income',
  food: 'Food', grocery: 'Food', groceries: 'Food',
  shopping: 'Shopping', rent: 'Rent', travel: 'Travel',
  electricity: 'Utilities', 'internet bill': 'Utilities', recharge: 'Utilities',
  bill: 'Bills', subscription: 'Subscription', emi: 'Loan/EMI', loan: 'Loan/EMI',
};

const DOCUMENT_CATEGORY_MAP = {
  insurance: 'Insurance', warranty: 'Warranty', service: 'Vehicle Service',
  rc: 'Vehicle Document', license: 'License', licence: 'License',
  aadhaar: 'Identity Document', 'pan card': 'Identity Document', passport: 'Identity Document',
  'driving license': 'License', certificate: 'Certificate',
  'pollution certificate': 'Certificate',
};

const PERSONAL_CATEGORY_MAP = {
  meeting: 'Meeting', appointment: 'Appointment', assignment: 'Assignment',
  project: 'Project', call: 'Call', study: 'Study', exam: 'Exam',
  interview: 'Interview', task: 'Task', dentist: 'Appointment', doctor: 'Appointment',
};

function protectNumberCommas(text) {
  // Turns "1,200" into "1<COMMA>200" so splitting on commas doesn't break amounts.
  return text.replace(/(\d),(\d)/g, '$1<COMMA>$2');
}

function restoreNumberCommas(text) {
  return text.replace(/<COMMA>/g, ',');
}

function splitIntoClauses(rawText) {
  const protectedText = protectNumberCommas(rawText.trim());
  const parts = protectedText
    .split(/(?:\.\s+|\n+|,\s*(?=[A-Za-z0-9₹])|\band\b|\baur\b|\bevam\b)/gi)
    .map((p) => restoreNumberCommas(p).trim())
    .filter((p) => p.length > 1);

  return parts.length ? parts : [restoreNumberCommas(protectedText)];
}

function getRelativeDate(daysFromToday) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + daysFromToday);
  return d;
}

function nextWeekday(targetDow) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const currentDow = d.getDay();
  let diff = targetDow - currentDow;
  if (diff <= 0) diff += 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function extractDate(clause) {
  const lower = clause.toLowerCase();

  if (/\btoday\b|\baaj\b/.test(lower)) {
    return { date: getRelativeDate(0), label: 'Today' };
  }
  if (/\btomorrow\b|\bkal\b/.test(lower)) {
    // "kal" is ambiguous (yesterday/tomorrow in Hindi) - we treat it as tomorrow, the common usage in reminders.
    return { date: getRelativeDate(1), label: 'Tomorrow' };
  }
  if (/\bnext week\b/.test(lower)) {
    return { date: getRelativeDate(7), label: 'Next week' };
  }
  if (/\bnext month\b/.test(lower)) {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setHours(0, 0, 0, 0);
    return { date: d, label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) };
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const numericMatch = lower.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
  if (numericMatch) {
    let [, dd, mm, yyyy] = numericMatch;
    if (yyyy.length === 2) yyyy = `20${yyyy}`;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (!Number.isNaN(d.getTime())) {
      return { date: d, label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) };
    }
  }

  // "18 September" or "September 18" (year optional)
  const monthNamesPattern = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|');
  const dayMonthRegex = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthNamesPattern})\\b(?:\\s+(\\d{4}))?`, 'i');
  const monthDayRegex = new RegExp(`\\b(${monthNamesPattern})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:\\s*,?\\s*(\\d{4}))?`, 'i');

  let m = lower.match(dayMonthRegex);
  if (m) {
    const day = Number(m[1]);
    const month = MONTHS[m[2].toLowerCase()];
    const year = m[3] ? Number(m[3]) : new Date().getFullYear();
    const d = new Date(year, month, day);
    if (!m[3] && d < getRelativeDate(0)) d.setFullYear(d.getFullYear() + 1);
    return { date: d, label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) };
  }

  m = lower.match(monthDayRegex);
  if (m) {
    const month = MONTHS[m[1].toLowerCase()];
    const day = Number(m[2]);
    const year = m[3] ? Number(m[3]) : new Date().getFullYear();
    const d = new Date(year, month, day);
    if (!m[3] && d < getRelativeDate(0)) d.setFullYear(d.getFullYear() + 1);
    return { date: d, label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) };
  }

  // Just a month name -> "December" (used for warranty-till-December style entries)
  const monthOnlyRegex = new RegExp(`\\b(${monthNamesPattern})\\b`, 'i');
  m = lower.match(monthOnlyRegex);
  if (m && !/\d{1,2}\s*(am|pm)/.test(lower)) {
    const month = MONTHS[m[1].toLowerCase()];
    const year = new Date().getFullYear();
    const d = new Date(year, month + 1, 0); // last day of that month
    if (d < getRelativeDate(0)) d.setFullYear(d.getFullYear() + 1);
    return { date: d, label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) };
  }

  // Weekday name -> next occurrence
  const weekdayNames = Object.keys(WEEKDAYS).sort((a, b) => b.length - a.length).join('|');
  const weekdayRegex = new RegExp(`\\b(${weekdayNames})\\b`, 'i');
  m = lower.match(weekdayRegex);
  if (m) {
    const dow = WEEKDAYS[m[1].toLowerCase()];
    const d = nextWeekday(dow);
    return { date: d, label: d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) };
  }

  return { date: null, label: 'Not specified' };
}

function extractTime(clause) {
  const lower = clause.toLowerCase();

  const clockMatch = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (clockMatch) {
    const hour = clockMatch[1];
    const minute = clockMatch[2] || '00';
    const meridiem = clockMatch[3].toUpperCase();
    return `${hour}:${minute} ${meridiem}`;
  }

  for (const [part, time] of Object.entries(DAY_PART_TIMES)) {
    if (new RegExp(`\\b${part}\\b`, 'i').test(lower)) {
      return time;
    }
  }

  return '';
}

function extractAmount(clause) {
  const patterns = [
    /₹\s*([\d,]+(?:\.\d{1,2})?)/,
    /\brs\.?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /\binr\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:rupees|rs\.?)\b/i,
  ];

  for (const pattern of patterns) {
    const m = clause.match(pattern);
    if (m) {
      const value = Number(m[1].replace(/,/g, ''));
      if (!Number.isNaN(value)) return value;
    }
  }
  return null;
}

function extractRecurring(clause) {
  const m = clause.match(RECURRING_WORDS);
  if (!m) return { recurring: false, frequency: 'none' };

  const text = m[0].toLowerCase();
  const weekdayNames = /sunday|monday|tuesday|wednesday|thursday|friday|saturday/;
  if (weekdayNames.test(text) || /week|hafte/.test(text)) return { recurring: true, frequency: 'weekly' };
  if (/day|roz|din|daily/.test(text)) return { recurring: true, frequency: 'daily' };
  if (/month|mahine|mahina/.test(text)) return { recurring: true, frequency: 'monthly' };
  if (/year|annually|saal/.test(text)) return { recurring: true, frequency: 'yearly' };
  return { recurring: true, frequency: 'none' };
}

function findMatchedKeyword(lower, keywordList) {
  const sorted = [...keywordList].sort((a, b) => b.length - a.length);
  return sorted.find((kw) => lower.includes(kw)) || null;
}

function detectModule(clause, hasAmount) {
  const lower = clause.toLowerCase();

  const documentKw = findMatchedKeyword(lower, DOCUMENT_KEYWORDS);
  const financeKw = findMatchedKeyword(lower, FINANCE_KEYWORDS);
  const personalKw = findMatchedKeyword(lower, PERSONAL_KEYWORDS);

  // Documents/assets keywords are fairly unambiguous (insurance, warranty, expiry...)
  if (documentKw) return { module: 'documents', keyword: documentKw };

  // If it clearly mentions money + a finance keyword (or just money + spend/pay language), it's finance.
  if (financeKw && (hasAmount || /\b(spent|paid|received|salary|income|bill)\b/i.test(lower))) {
    return { module: 'finance', keyword: financeKw };
  }
  if (hasAmount && !personalKw) {
    return { module: 'finance', keyword: financeKw || 'payment' };
  }

  if (personalKw) return { module: 'personal', keyword: personalKw };

  // Filler action phrases ("karna hai" etc.) confirm "personal" tone but aren't real categories.
  if (findMatchedKeyword(lower, PERSONAL_FILLER_PHRASES)) return { module: 'personal', keyword: null };

  // Fall back: money present -> finance, otherwise personal (a generic task/reminder).
  if (hasAmount) return { module: 'finance', keyword: 'payment' };
  return { module: 'personal', keyword: null };
}

function titleCase(str) {
  return str.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
}

function buildTitle(clause, moduleName, keyword) {
  let cleaned = clause
    .replace(/₹\s*[\d,]+(?:\.\d{1,2})?/g, '')
    .replace(/\brs\.?\s*[\d,]+(?:\.\d{1,2})?/gi, '')
    .replace(/[\d,]+(?:\.\d{1,2})?\s*rupees/gi, '')
    .replace(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/g, '')
    .replace(/\b\d{1,2}(?::\d{2})?\s*(am|pm)\b/gi, '')
    .replace(/\b(today|tomorrow|aaj|kal|next week|next month)\b/gi, '')
    .replace(/\b(hai|hoon|karna|karni|ko|tak|par|pe|milegi|bharna)\b/gi, '')
    .replace(/[.,]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!cleaned || cleaned.length < 2) {
    cleaned = keyword || (moduleName === 'finance' ? 'Transaction' : moduleName === 'documents' ? 'Document' : 'Task');
  }

  // Keep titles reasonably short and readable.
  if (cleaned.length > 60) cleaned = `${cleaned.slice(0, 57)}...`;
  return titleCase(cleaned);
}

function determineCategory(moduleName, keyword, clause) {
  const lower = (clause || '').toLowerCase();
  const categoryMap = moduleName === 'finance' ? FINANCE_CATEGORY_MAP
    : moduleName === 'documents' ? DOCUMENT_CATEGORY_MAP
      : PERSONAL_CATEGORY_MAP;

  // Prefer a keyword that maps to a real category name (e.g. "food", "insurance")
  // over a generic action verb (e.g. "spent", "paid") that may have matched first.
  const namedCategoryKeyword = Object.keys(categoryMap)
    .sort((a, b) => b.length - a.length)
    .find((kw) => lower.includes(kw));

  if (namedCategoryKeyword) return categoryMap[namedCategoryKeyword];
  if (keyword) return categoryMap[keyword] || titleCase(keyword);
  return 'General';
}

function determineType(moduleName, clause, keyword) {
  const lower = clause.toLowerCase();
  if (moduleName === 'finance') {
    if (/salary|income|received/.test(lower)) return 'income';
    if (/subscription/.test(lower)) return 'subscription';
    if (/bill/.test(lower)) return 'bill';
    return 'expense';
  }
  if (moduleName === 'documents') {
    if (/insurance/.test(lower)) return 'insurance';
    if (/warranty/.test(lower)) return 'warranty';
    if (/service/.test(lower)) return 'service';
    if (/aadhaar|pan card|passport|driving license|licence|license|rc\b|certificate/.test(lower)) return 'document';
    return 'asset';
  }
  // personal
  if (/meeting/.test(lower)) return 'meeting';
  if (/appointment|dentist|doctor/.test(lower)) return 'appointment';
  if (/call\b/.test(lower)) return 'call';
  if (/assignment/.test(lower)) return 'assignment';
  return 'task';
}

function determinePriority(moduleName, dateInfo, clause) {
  const lower = clause.toLowerCase();
  const urgentWords = /\burgent\b|\basap\b|\bimportant\b|\bimmediately\b/;

  if (moduleName === 'documents' && dateInfo.date) {
    const daysUntil = Math.ceil((dateInfo.date - getRelativeDate(0)) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 7) return 'high';
    if (daysUntil <= 30) return 'medium';
    return 'low';
  }

  if (urgentWords.test(lower)) return 'high';

  if (!dateInfo.date) return 'low';

  const daysUntil = Math.ceil((dateInfo.date - getRelativeDate(0)) / (1000 * 60 * 60 * 24));
  if (daysUntil <= 1) return 'high';
  if (daysUntil <= 7) return 'medium';
  return 'low';
}

/**
 * Parses a raw note into an array of structured record objects.
 * @param {string} text
 * @returns {Array<object>}
 */
function parseNote(text) {
  if (!text || !text.trim()) return [];

  const clauses = splitIntoClauses(text);
  const results = [];

  for (const clause of clauses) {
    const amount = extractAmount(clause);
    const dateInfo = extractDate(clause);
    const time = extractTime(clause);
    const recurringInfo = extractRecurring(clause);
    const { module: moduleName, keyword } = detectModule(clause, amount !== null);

    // Skip clauses that carry no usable signal at all (e.g. leftover filler words).
    const hasSignal = amount !== null || dateInfo.date || time || keyword || clause.trim().split(' ').length > 1;
    if (!hasSignal) continue;

    const type = determineType(moduleName, clause, keyword);
    const category = determineCategory(moduleName, keyword, clause);
    const title = buildTitle(clause, moduleName, keyword);
    const priority = determinePriority(moduleName, dateInfo, clause);

    results.push({
      module: moduleName,
      type,
      title,
      category,
      amount: moduleName === 'finance' ? amount : null,
      date: dateInfo.date,
      dateLabel: dateInfo.label,
      time,
      priority,
      recurring: recurringInfo.recurring,
      frequency: recurringInfo.frequency,
      reminderEnabled: moduleName !== 'finance',
      sourceClause: clause.trim(),
    });
  }

  return results;
}

module.exports = { parseNote };
