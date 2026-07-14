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

app.use(cors({ origin: 'https://goldwire.netlify.app' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/admin', adminAuthRouter);
app.use('/api/signals', signalsRouter);
app.use('/api/settings', settingsRouter);
app.listen(PORT, () => {
  console.log(`GOLDWIRE backend running on http://localhost:${PORT}`);
});
