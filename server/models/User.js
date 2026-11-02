const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const notificationPreferencesSchema = new mongoose.Schema({
  personal: {
    inApp: { type: Boolean, default: true },
    alarm: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    email: { type: Boolean, default: false },
  },
  documents: {
    inApp: { type: Boolean, default: true },
    alarm: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    email: { type: Boolean, default: false },
  },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  // last 10 digits of the phone, used for logging in with a phone number
  phoneDigits: { type: String, index: true, sparse: true },
  countryCode: { type: String, trim: true, default: '+91' },
  password: { type: String, required: true, minlength: 6 },
  avatar: { type: String, default: '' },
  // bumped on password change / "log out everywhere": invalidates every older token
  tokenVersion: { type: Number, default: 0 },
  resetOtpHash: { type: String, select: false },
  resetOtpExpires: { type: Date, select: false },
  resetOtpAttempts: { type: Number, default: 0, select: false },
  theme: { type: String, enum: ['light'], default: 'light' },
  notificationPreferences: { type: notificationPreferencesSchema, default: () => ({}) },
}, { timestamps: true });

function toPhoneDigits(phone) {
  const d = String(phone || '').replace(/\D/g, '');
  return d ? d.slice(-10) : undefined;
}

userSchema.pre('save', function syncPhoneDigits(next) {
  if (this.isModified('phone')) this.phoneDigits = toPhoneDigits(this.phone);
  next();
});

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetOtpHash;
  delete obj.resetOtpExpires;
  delete obj.resetOtpAttempts;
  delete obj.tokenVersion;
  delete obj.phoneDigits;
  return obj;
};

const User = mongoose.model('User', userSchema);
User.toPhoneDigits = toPhoneDigits;
module.exports = User;
