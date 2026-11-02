/**
 * smsService.js
 * Sends SMS reminders (e.g. "your bike insurance expires on 20 October" or an alarm-style
 * ping) to the user's registered phone number via Twilio. Falls back to a safe mock/dev
 * mode — logging instead of sending — whenever Twilio credentials are not configured in
 * .env, so the app never crashes locally without an SMS account.
 */

let twilioClient = null;

const isConfigured = () => !!(
  process.env.SMS_PROVIDER === 'twilio'
  && process.env.SMS_API_KEY   // Twilio Account SID
  && process.env.SMS_API_SECRET // Twilio Auth Token
  && process.env.SMS_FROM_NUMBER
);

function getClient() {
  if (twilioClient) return twilioClient;
  // eslint-disable-next-line global-require
  const twilio = require('twilio');
  twilioClient = twilio(process.env.SMS_API_KEY, process.env.SMS_API_SECRET);
  return twilioClient;
}

function normalizePhone(to) {
  // Ensure E.164-ish format (leading +). Users enter countryCode + phone separately in Profile.
  if (!to) return null;
  const trimmed = to.replace(/[\s-]/g, '');
  return trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
}

async function sendSMS({ to, message }) {
  const recipient = normalizePhone(to);
  if (!recipient || recipient === '+') {
    return { success: false, error: 'No phone number on file for this user. Add one in Profile.' };
  }

  if (!isConfigured()) {
    // Development / mock mode: log instead of sending, so the app runs without an SMS provider.
    console.log(`[MOCK SMS] to=${recipient} message="${message}"`);
    return { success: true, mock: true };
  }

  try {
    const client = getClient();
    const result = await client.messages.create({
      to: recipient,
      from: process.env.SMS_FROM_NUMBER,
      body: message,
    });
    return { success: true, mock: false, sid: result.sid, status: result.status };
  } catch (err) {
    console.error('[SMS] Twilio send failed:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendSMS, isConfigured, normalizePhone };
