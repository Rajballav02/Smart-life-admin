process.env.JWT_SECRET = 'test-secret';
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../models/User', () => {
  const User = {
    findById: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    toPhoneDigits: (p) => { const d = String(p || '').replace(/\D/g, ''); return d ? d.slice(-10) : undefined; },
  };
  return User;
});

const User = require('../models/User');
const app = require('../app');
const { validatePassword } = require('../utils/passwordPolicy');

describe('password policy', () => {
  test.each([
    ['short1', false], ['alllettersonly', false], ['12345678', false], ['Ballav@123', true], ['abcdefg1', true],
  ])('%s -> valid=%s', (pw, ok) => {
    expect(validatePassword(pw) === null).toBe(ok);
  });
});

describe('phone digits', () => {
  test('normalises common formats to the last 10 digits', () => {
    expect(User.toPhoneDigits('+91 73229-55686')).toBe('7322955686');
    expect(User.toPhoneDigits('07322955686')).toBe('7322955686');
    expect(User.toPhoneDigits('')).toBeUndefined();
  });
});

describe('auth input validation (no DB needed)', () => {
  test('register rejects a weak password', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'A', email: 'a@b.com', password: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/8 characters/);
  });
  test('login needs identifier + password', async () => {
    const res = await request(app).post('/api/auth/login').send({ identifier: '7322955686' });
    expect(res.status).toBe(400);
  });
  test('forgot-password needs an identifier', async () => {
    expect((await request(app).post('/api/auth/forgot-password').send({})).status).toBe(400);
  });
  test('reset-password rejects a weak new password before touching the DB', async () => {
    const res = await request(app).post('/api/auth/reset-password').send({ identifier: 'a@b.com', otp: '123456', newPassword: 'weak' });
    expect(res.status).toBe(400);
  });
  test('change-password requires a login', async () => {
    expect((await request(app).put('/api/auth/change-password').send({})).status).toBe(401);
  });
});

describe('login by email or phone', () => {
  const user = {
    _id: 'u1', tokenVersion: 0, comparePassword: async (p) => p === 'Ballav@123',
    toSafeObject() { return { _id: 'u1', name: 'Ballav' }; },
  };
  test('phone number works as the login identifier', async () => {
    User.findOne.mockResolvedValueOnce(user);
    const res = await request(app).post('/api/auth/login').send({ identifier: '+91 73229 55686', password: 'Ballav@123' });
    expect(res.status).toBe(200);
    expect(User.findOne).toHaveBeenCalledWith({ phoneDigits: '7322955686' });
    expect(res.body.token).toBeTruthy();
  });
  test('wrong password is rejected', async () => {
    User.findOne.mockResolvedValueOnce(user);
    const res = await request(app).post('/api/auth/login').send({ identifier: 'a@b.com', password: 'nope' });
    expect(res.status).toBe(401);
  });
});

describe('token versioning (log out everywhere)', () => {
  const select = (u) => ({ select: async () => u });
  test('a token issued before a password change is rejected', async () => {
    const old = jwt.sign({ id: 'u1', v: 0 }, 'test-secret');
    User.findById.mockReturnValueOnce(select({ _id: 'u1', tokenVersion: 1 }));
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${old}`);
    expect(res.status).toBe(401);
  });
  test('a current token is accepted', async () => {
    const fresh = jwt.sign({ id: 'u1', v: 1 }, 'test-secret');
    User.findById.mockReturnValueOnce(select({ _id: 'u1', tokenVersion: 1, name: 'Ballav' }));
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${fresh}`);
    expect(res.status).toBe(200);
  });
});
