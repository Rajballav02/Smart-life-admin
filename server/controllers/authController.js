const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { validatePassword } = require('../utils/passwordPolicy');
const { sendSMS } = require('../services/smsService');
const { sendEmail } = require('../services/emailService');

const OTP_TTL_MS = 15 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

function signToken(user) {
  return jwt.sign({ id: user._id, v: user.tokenVersion || 0 }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
}

// Accepts an email address or a phone number (any common format).
async function findByIdentifier(identifier, { withSecrets = false } = {}) {
  const value = String(identifier || '').trim();
  if (!value) return null;
  const query = value.includes('@')
    ? { email: value.toLowerCase() }
    : { phoneDigits: User.toPhoneDigits(value) };
  if (!query.email && !query.phoneDigits) return null;
  let q = User.findOne(query);
  if (withSecrets) q = q.select('+resetOtpHash +resetOtpExpires +resetOtpAttempts');
  return q;
}

const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password, confirmPassword } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required.' });
  }
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match.' });
  }
  const passwordError = validatePassword(password);
  if (passwordError) return res.status(400).json({ message: passwordError });

  if (await User.findOne({ email: email.toLowerCase() })) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }
  const digits = User.toPhoneDigits(phone);
  if (digits && await User.findOne({ phoneDigits: digits })) {
    return res.status(409).json({ message: 'An account with this phone number already exists.' });
  }

  const user = await User.create({ name, email, phone, password });
  res.status(201).json({ token: signToken(user), user: user.toSafeObject() });
});

const login = asyncHandler(async (req, res) => {
  // `identifier` can be an email or a phone number; `email` is still accepted for older clients.
  const identifier = req.body.identifier || req.body.email;
  const { password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ message: 'Email or phone, and password are required.' });
  }

  const user = await findByIdentifier(identifier);
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid email/phone or password.' });
  }

  res.json({ token: signToken(user), user: user.toSafeObject() });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, countryCode, avatar, notificationPreferences } = req.body;
  const user = await User.findById(req.user._id);

  if (name !== undefined) user.name = name;
  if (phone !== undefined) {
    const digits = User.toPhoneDigits(phone);
    if (digits) {
      const clash = await User.findOne({ phoneDigits: digits, _id: { $ne: user._id } });
      if (clash) return res.status(409).json({ message: 'This phone number is used by another account.' });
    }
    user.phone = phone;
  }
  if (countryCode !== undefined) user.countryCode = countryCode;
  if (avatar !== undefined) user.avatar = avatar;
  if (notificationPreferences !== undefined) {
    user.notificationPreferences = { ...user.notificationPreferences, ...notificationPreferences };
  }

  await user.save();
  res.json({ user: user.toSafeObject() });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new password are required.' });
  }
  const passwordError = validatePassword(newPassword);
  if (passwordError) return res.status(400).json({ message: passwordError });

  const user = await User.findById(req.user._id);
  if (!(await user.comparePassword(currentPassword))) {
    return res.status(401).json({ message: 'Current password is incorrect.' });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ message: 'New password must be different from the current one.' });
  }

  user.password = newPassword;
  user.tokenVersion = (user.tokenVersion || 0) + 1; // signs out every other device
  await user.save();
  res.json({ token: signToken(user), user: user.toSafeObject(), message: 'Password updated.' });
});

const logoutAll = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  res.json({ message: 'Signed out on all devices.' });
});

const GENERIC_RESET_MESSAGE = 'If an account exists, a 6-digit code has been sent to its phone and email.';

const forgotPassword = asyncHandler(async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) return res.status(400).json({ message: 'Enter your email or phone number.' });

  const user = await findByIdentifier(identifier, { withSecrets: true });
  const response = { message: GENERIC_RESET_MESSAGE };

  if (user) {
    const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    user.resetOtpHash = await bcrypt.hash(otp, 8);
    user.resetOtpExpires = new Date(Date.now() + OTP_TTL_MS);
    user.resetOtpAttempts = 0;
    await user.save();

    const text = `Your Smart Life Admin password reset code is ${otp}. It expires in 15 minutes. If you did not ask for this, ignore this message.`;
    const smsTo = user.phone ? `${user.countryCode || ''}${user.phone}` : null;
    const [sms, email] = await Promise.all([
      smsTo ? sendSMS({ to: smsTo, message: text }) : { success: false },
      sendEmail({ to: user.email, subject: 'Smart Life Admin — password reset code', text }),
    ]);

    // Dev convenience only: when nothing could really be delivered and we are not in production,
    // return the code so the flow can be tried without SMS/email set up.
    if (process.env.NODE_ENV !== 'production' && (sms.mock || email.mock || (!sms.success && !email.success))) {
      response.devOtp = otp;
    }
  }

  res.json(response);
});

const resetPassword = asyncHandler(async (req, res) => {
  const { identifier, otp, newPassword } = req.body;
  if (!identifier || !otp || !newPassword) {
    return res.status(400).json({ message: 'Identifier, code and new password are required.' });
  }
  const passwordError = validatePassword(newPassword);
  if (passwordError) return res.status(400).json({ message: passwordError });

  const user = await findByIdentifier(identifier, { withSecrets: true });
  const invalid = () => res.status(400).json({ message: 'Invalid or expired code.' });
  if (!user || !user.resetOtpHash || !user.resetOtpExpires || user.resetOtpExpires < new Date()) return invalid();

  if ((user.resetOtpAttempts || 0) >= OTP_MAX_ATTEMPTS) {
    user.resetOtpHash = undefined;
    user.resetOtpExpires = undefined;
    await user.save();
    return res.status(429).json({ message: 'Too many wrong attempts. Request a new code.' });
  }

  if (!(await bcrypt.compare(String(otp).trim(), user.resetOtpHash))) {
    user.resetOtpAttempts = (user.resetOtpAttempts || 0) + 1;
    await user.save();
    return invalid();
  }

  user.password = newPassword;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  user.resetOtpHash = undefined;
  user.resetOtpExpires = undefined;
  user.resetOtpAttempts = 0;
  await user.save();

  res.json({ token: signToken(user), user: user.toSafeObject(), message: 'Password reset.' });
});

module.exports = { register, login, me, updateProfile, changePassword, logoutAll, forgotPassword, resetPassword };
