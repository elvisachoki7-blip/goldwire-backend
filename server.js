require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { router: authRouter } = require('./routes/auth');
const { router: adminAuthRouter } = require('./routes/admin');
const signalsRouter = require('./routes/signals');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors()); // in production, restrict origin to your Netlify domain
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/admin', adminAuthRouter);
app.use('/api/signals', signalsRouter);

app.listen(PORT, () => {
  console.log(`GOLDWIRE backend running on http://localhost:${PORT}`);
});
