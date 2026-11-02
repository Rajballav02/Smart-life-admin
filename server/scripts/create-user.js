/**
 * Creates (or resets the password of) a user directly in MongoDB — handy for your own first login.
 *
 *   node scripts/create-user.js --name "Your Name" --email you@example.com --phone 9876543210 --password "YourPass123"
 *
 * The password is read from the command line only; it is never stored in any project file.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const { validatePassword } = require('../utils/passwordPolicy');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

(async () => {
  const name = arg('name') || 'Me';
  const email = (arg('email') || '').toLowerCase();
  const phone = arg('phone');
  const password = arg('password');
  const countryCode = arg('code') || '+91';

  if (!email || !password) {
    console.error('Usage: node scripts/create-user.js --name "Name" --email a@b.com --phone 9876543210 --password "Pass1234"');
    process.exit(1);
  }
  const problem = validatePassword(password);
  if (problem) { console.error(problem); process.exit(1); }

  await mongoose.connect(process.env.MONGODB_URI);
  let user = await User.findOne({ email });
  if (user) {
    user.name = name; if (phone) user.phone = phone; user.countryCode = countryCode;
    user.password = password; user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    console.log(`Updated existing user ${email} (password reset, other sessions signed out).`);
  } else {
    user = await User.create({ name, email, phone, countryCode, password });
    console.log(`Created user ${email}. You can log in with this email or the phone number.`);
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
