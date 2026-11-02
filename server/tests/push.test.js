process.env.JWT_SECRET = 'test-secret';
const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('web-push', () => ({ setVapidDetails: jest.fn(), sendNotification: jest.fn() }));
jest.mock('../models/PushSubscription', () => ({ find: jest.fn(), deleteOne: jest.fn(), findOneAndUpdate: jest.fn() }));
jest.mock('../models/User', () => ({
  findById: jest.fn(), findOne: jest.fn(), create: jest.fn(),
  toPhoneDigits: (p) => String(p || '').replace(/\D/g, '').slice(-10) || undefined,
}));

const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');
const User = require('../models/User');
const app = require('../app');

const token = jwt.sign({ id: 'u1', v: 0 }, 'test-secret');
const authed = () => { User.findById.mockReturnValue({ select: async () => ({ _id: 'u1', tokenVersion: 0 }) }); };

describe('push service', () => {
  beforeEach(() => { jest.resetModules(); jest.clearAllMocks(); delete process.env.VAPID_PUBLIC_KEY; delete process.env.VAPID_PRIVATE_KEY; });

  test('is a harmless no-op when VAPID keys are missing', async () => {
    const { sendToUser } = require('../services/pushService');
    const res = await sendToUser('u1', { title: 't', body: 'b' });
    expect(res).toEqual({ sent: 0, mock: true });
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  test('sends to every subscribed device and removes dead ones (410)', async () => {
    process.env.VAPID_PUBLIC_KEY = 'pub'; process.env.VAPID_PRIVATE_KEY = 'priv';
    const PS = require('../models/PushSubscription');
    PS.find.mockResolvedValue([
      { _id: 'a', endpoint: 'https://push/a', keys: { p256dh: 'x', auth: 'y' } },
      { _id: 'b', endpoint: 'https://push/b', keys: { p256dh: 'x', auth: 'y' } },
    ]);
    const wp = require('web-push');
    wp.sendNotification.mockResolvedValueOnce({}).mockRejectedValueOnce({ statusCode: 410 });
    const { sendToUser } = require('../services/pushService');
    const res = await sendToUser('u1', { title: 'Meeting', body: 'Friday 5 PM' });
    expect(res.sent).toBe(1);
    expect(PS.deleteOne).toHaveBeenCalledWith({ _id: 'b' });
    expect(JSON.parse(wp.sendNotification.mock.calls[0][1]).title).toBe('Meeting');
  });
});

describe('push routes', () => {
  beforeEach(() => { jest.clearAllMocks(); delete process.env.VAPID_PUBLIC_KEY; delete process.env.VAPID_PRIVATE_KEY; authed(); });

  test('subscribe requires a login', async () => {
    expect((await request(app).post('/api/push/subscribe').send({})).status).toBe(401);
  });
  test('subscribe rejects a malformed subscription', async () => {
    const res = await request(app).post('/api/push/subscribe').set('Authorization', `Bearer ${token}`).send({ endpoint: 'x' });
    expect(res.status).toBe(400);
  });
  test('subscribe stores a valid subscription', async () => {
    PushSubscription.findOneAndUpdate.mockResolvedValue({});
    const res = await request(app).post('/api/push/subscribe').set('Authorization', `Bearer ${token}`)
      .send({ endpoint: 'https://push/x', keys: { p256dh: 'a', auth: 'b' } });
    expect(res.status).toBe(201);
    expect(PushSubscription.findOneAndUpdate).toHaveBeenCalled();
  });
  test('public-key reports whether push is enabled', async () => {
    const res = await request(app).get('/api/push/public-key').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(false);
  });
  test('test push explains when the server has no VAPID keys', async () => {
    const res = await request(app).post('/api/push/test').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(503);
  });
});
