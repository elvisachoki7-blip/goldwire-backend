require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { router: authRouter } = require('./routes/auth');
const { router: adminAuthRouter } = require('./routes/admin');
const signalsRouter = require('./routes/signals');
const settingsRouter = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 4000;
const allowedOrigins = (process.env.CORS_ORIGINS || 'https://goldwire.netlify.app')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (
  process.env.NODE_ENV === 'production' &&
  (!process.env.JWT_SECRET ||
    !process.env.ADMIN_PASSWORD ||
    !process.env.MT5_WEBHOOK_SECRET)
) {
  throw new Error(
    'JWT_SECRET, ADMIN_PASSWORD, and MT5_WEBHOOK_SECRET must be set in production.'
  );
}

app.disable('x-powered-by');

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origin not allowed by CORS'));
    },
  })
);

app.use(express.json({ limit: '16kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/admin', adminAuthRouter);
app.use('/api/signals', signalsRouter);
app.use('/api/settings', settingsRouter);

app.listen(PORT, () => {
  console.log(`GOLDWIRE backend running on http://localhost:${PORT}`);
});
