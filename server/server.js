require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { startReminderScheduler } = require('./services/reminderService');

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Smart Life Admin API running on port ${PORT}`);
    startReminderScheduler();
  });
}).catch((err) => {
  console.error('Failed to connect to MongoDB:', err.message);
  process.exit(1);
});
