const nodemailer = require('nodemailer');

const isConfigured = () => !!(
  process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD
);

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
  });
  return transporter;
}

async function sendEmail({ to, title, message, category = '', date = '', time = '', subject: customSubject, text }) {
  const subject = customSubject || 'Smart Life Admin — Reminder';
  const body = text || [
    `Reminder: ${title}`,
    message,
    category ? `Category: ${category}` : null,
    date ? `Date: ${date}` : null,
    time ? `Time: ${time}` : null,
  ].filter(Boolean).join('\n');

  if (!isConfigured()) {
    console.log(`[MOCK EMAIL] to=${to} subject="${subject}"\n${body}`);
    return { success: true, mock: true };
  }

  try {
    await getTransporter().sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      text: body,
    });
    return { success: true, mock: false };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { sendEmail, isConfigured };
