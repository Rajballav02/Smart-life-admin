/**
 * Sends ONE real test SMS using the credentials in server/.env, so you can confirm
 * your Twilio setup works before relying on alarms.
 *
 * Usage:  npm run test:sms -- +919876543210
 */
require('dotenv').config();
const { sendSMS, isConfigured } = require('../services/smsService');

(async () => {
  const to = process.argv[2];
  if (!to) {
    console.log('Usage: npm run test:sms -- +<countrycode><number>');
    process.exit(1);
  }
  if (!isConfigured()) {
    console.log('Twilio is NOT configured. Set SMS_PROVIDER=twilio, SMS_API_KEY (Account SID),');
    console.log('SMS_API_SECRET (Auth Token) and SMS_FROM_NUMBER in server/.env first.');
    console.log('(Running in mock mode — the message below is only logged, not sent.)\n');
  }
  const result = await sendSMS({ to, message: 'Smart Life Admin: test alarm reminder. If you got this, SMS works!' });
  console.log('Result:', result);
  process.exit(result.success ? 0 : 1);
})();
