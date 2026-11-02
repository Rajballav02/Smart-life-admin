const request = require('supertest');
const app = require('../app');

describe('GET /api/health', () => {
  test('returns 200 and ok status without needing a database connection', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('POST /api/auth/register — input validation (runs before any DB call)', () => {
  test('rejects registration with missing fields', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/required/i);
  });

  test('rejects registration when passwords do not match', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User', email: 'test@example.com', password: 'secret123', confirmPassword: 'different',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/do not match/i);
  });
});

describe('POST /api/auth/login — input validation', () => {
  test('rejects login with missing credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });
});

describe('Protected routes require a valid JWT', () => {
  test('GET /api/dashboard without a token is rejected', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(401);
  });

  test('GET /api/records with a garbage token is rejected', async () => {
    const res = await request(app).get('/api/records').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  test('POST /api/notes without a token is rejected', async () => {
    const res = await request(app).post('/api/notes').send({ text: 'Buy groceries.' });
    expect(res.status).toBe(401);
  });
});

describe('Unknown routes', () => {
  test('returns 404 for a route that does not exist', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
  });
});
