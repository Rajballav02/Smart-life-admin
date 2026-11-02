// Prints a fresh VAPID key pair for Web Push. Paste the three lines into server/.env
// (or into your hosting dashboard's environment variables).
const webpush = require('web-push');
const keys = webpush.generateVAPIDKeys();
console.log('\nAdd these to server/.env:\n');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log('VAPID_SUBJECT=mailto:you@example.com\n');
