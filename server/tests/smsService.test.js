describe('smsService', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('falls back to mock mode when Twilio is not configured (no crash)', async () => {
    delete process.env.SMS_PROVIDER;
    delete process.env.SMS_API_KEY;
    delete process.env.SMS_API_SECRET;
    delete process.env.SMS_FROM_NUMBER;

    const { sendSMS, isConfigured } = require('../services/smsService');
    expect(isConfigured()).toBe(false);

    const result = await sendSMS({ to: '+919876543210', message: 'Reminder: test' });
    expect(result.success).toBe(true);
    expect(result.mock).toBe(true);
  });

  test('returns a clear error when no phone number is on file', async () => {
    const { sendSMS } = require('../services/smsService');
    const result = await sendSMS({ to: '', message: 'Reminder: test' });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no phone number/i);
  });

  test('normalizes phone numbers to E.164-ish format (+countrycode number)', () => {
    const { normalizePhone } = require('../services/smsService');
    expect(normalizePhone('919876543210')).toBe('+919876543210');
    expect(normalizePhone('+91 98765 43210')).toBe('+919876543210');
    expect(normalizePhone('')).toBeNull();
  });

  test('when Twilio IS configured, sendSMS calls the real Twilio client with correct params', async () => {
    process.env.SMS_PROVIDER = 'twilio';
    process.env.SMS_API_KEY = 'ACtestsid';
    process.env.SMS_API_SECRET = 'testtoken';
    process.env.SMS_FROM_NUMBER = '+15005550006';

    const createMock = jest.fn().mockResolvedValue({ sid: 'SM123', status: 'queued' });
    jest.doMock('twilio', () => jest.fn(() => ({ messages: { create: createMock } })));

    const { sendSMS, isConfigured } = require('../services/smsService');
    expect(isConfigured()).toBe(true);

    const result = await sendSMS({ to: '+919876543210', message: 'Bike insurance expires on 20 October.' });

    expect(createMock).toHaveBeenCalledWith({
      to: '+919876543210',
      from: '+15005550006',
      body: 'Bike insurance expires on 20 October.',
    });
    expect(result.success).toBe(true);
    expect(result.mock).toBe(false);
    expect(result.sid).toBe('SM123');

    jest.dontMock('twilio');
  });

  test('when Twilio throws, sendSMS returns a failure result instead of crashing', async () => {
    process.env.SMS_PROVIDER = 'twilio';
    process.env.SMS_API_KEY = 'ACtestsid';
    process.env.SMS_API_SECRET = 'testtoken';
    process.env.SMS_FROM_NUMBER = '+15005550006';

    const createMock = jest.fn().mockRejectedValue(new Error('Invalid phone number'));
    jest.doMock('twilio', () => jest.fn(() => ({ messages: { create: createMock } })));

    const { sendSMS } = require('../services/smsService');
    const result = await sendSMS({ to: '+91123', message: 'test' });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid phone number/i);

    jest.dontMock('twilio');
  });
});
