/**
 * End-to-end smoke test against a RUNNING server + real MongoDB.
 *
 * Usage (backend must be running: `npm run dev` in another terminal):
 *   npm run smoke
 *   API_URL=http://localhost:5000/api npm run smoke
 *
 * It registers a throwaway user, posts the spec's final demo note, and verifies
 * that 4 separate records land in the right modules, the Life Hub counts update,
 * Finance totals are correct, and complete/edit/delete work through the real DB.
 */
const API = process.env.API_URL || 'http://localhost:5000/api';

let passed = 0;
let failed = 0;
function check(name, condition, extra = '') {
  if (condition) { passed += 1; console.log(`  PASS  ${name}`); }
  else { failed += 1; console.log(`  FAIL  ${name} ${extra}`); }
}

async function call(method, path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  return { status: res.status, data };
}

(async () => {
  console.log(`Smoke testing ${API}\n`);

  const health = await call('GET', '/health');
  check('server is reachable', health.status === 200, '(is the backend running?)');
  if (health.status !== 200) process.exit(1);

  const email = `smoke_${Date.now()}@example.com`;
  const reg = await call('POST', '/auth/register', {
    name: 'Smoke Tester', email, phone: '9876543210', password: 'Secret123x', confirmPassword: 'Secret123x',
  });
  check('register works', reg.status === 201 && reg.data?.token);
  const token = reg.data?.token;

  const dup = await call('POST', '/auth/register', { name: 'X', email, password: 'Secret123x' });
  check('duplicate email is rejected', dup.status === 409);

  const bad = await call('POST', '/auth/login', { email, password: 'wrong-password' });
  check('wrong password is rejected', bad.status === 401);

  const login = await call('POST', '/auth/login', { email, password: 'Secret123x' });
  check('login works', login.status === 200 && !!login.data?.token);

  const me = await call('GET', '/auth/me', null, token);
  check('/auth/me returns the user without a password', me.status === 200 && !me.data?.user?.password);

  const demo = '18 September ko electricity bill ₹1200 bharna hai. Friday ko 5 PM project meeting hai. '
    + '20 October ko bike insurance expire hai. Aaj food pe ₹350 spend kiya.';
  const note = await call('POST', '/notes', { text: demo }, token);
  check('smart note creates 4 separate records', note.status === 201 && note.data?.records?.length === 4,
    `(got ${note.data?.records?.length})`);

  const records = note.data?.records || [];
  check('1 personal record', records.filter((r) => r.module === 'personal').length === 1);
  check('2 finance records', records.filter((r) => r.module === 'finance').length === 2);
  check('1 documents record', records.filter((r) => r.module === 'documents').length === 1);

  const noDate = await call('POST', '/notes', { text: 'Buy groceries.' }, token);
  check('missing date stays "Not specified"', noDate.data?.records?.[0]?.dateLabel === 'Not specified'
    && noDate.data?.records?.[0]?.date === null);

  const dash = await call('GET', '/dashboard', null, token);
  check('life hub returns all three sections', dash.status === 200
    && !!dash.data?.personal && !!dash.data?.finance && !!dash.data?.documents);

  const list = await call('GET', '/records?module=finance', null, token);
  check('finance list has 2 records', list.data?.records?.length === 2);

  const search = await call('GET', '/records?search=insurance', null, token);
  check('global search finds the insurance record', search.data?.records?.length >= 1);

  const weekly = await call('GET', '/finance/weekly', null, token);
  const monthly = await call('GET', '/finance/monthly', null, token);
  const half = await call('GET', '/finance/half-monthly', null, token);
  check('finance weekly/half-monthly/monthly endpoints respond',
    weekly.status === 200 && monthly.status === 200 && half.status === 200);
  check('savings = income - expenses', monthly.data?.savings === monthly.data?.income - monthly.data?.expenses);

  const personal = records.find((r) => r.module === 'personal');
  const edited = await call('PUT', `/records/${personal._id}`, { title: 'Edited Meeting', priority: 'high' }, token);
  check('edit persists', edited.data?.record?.title === 'Edited Meeting' && edited.data?.record?.priority === 'high');

  const done = await call('POST', `/records/${personal._id}/complete`, null, token);
  check('complete persists', done.data?.record?.status === 'completed');

  const del = await call('DELETE', `/records/${personal._id}`, null, token);
  check('delete works', del.status === 200);
  const gone = await call('GET', `/records/${personal._id}`, null, token);
  check('deleted record is really gone', gone.status === 404);

  // Second user must never see the first user's data.
  const other = await call('POST', '/auth/register', {
    name: 'Other', email: `other_${Date.now()}@example.com`, password: 'Secret123x',
  });
  const otherList = await call('GET', '/records', null, other.data?.token);
  check('users cannot see each other\'s records', otherList.data?.records?.length === 0);
  const crossRead = await call('GET', `/records/${records[1]._id}`, null, other.data?.token);
  check('cross-user record access is blocked', crossRead.status === 404);

  const notifs = await call('GET', '/notifications', null, token);
  check('notifications endpoint responds', notifs.status === 200);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((err) => { console.error('Smoke test crashed:', err.message); process.exit(1); });
