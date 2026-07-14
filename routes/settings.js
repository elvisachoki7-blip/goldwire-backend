const express = require('express');
const db = require('../db');
const { requireAuth } = require('./auth');
const { requireAdmin } = require('./admin');

const router = express.Router();

// Creates the table on first load — no changes to db.js needed.
db.exec(`
  CREATE TABLE IF NOT EXISTS strategy_settings (
    user_id INTEGER PRIMARY KEY,
    ema_fast INTEGER DEFAULT 12,
    ema_slow INTEGER DEFAULT 26,
    rsi_period INTEGER DEFAULT 14,
    rsi_overbought INTEGER DEFAULT 70,
    rsi_oversold INTEGER DEFAULT 30,
    macd_fast INTEGER DEFAULT 12,
    macd_slow INTEGER DEFAULT 26,
    macd_signal INTEGER DEFAULT 9,
    atr_multiplier REAL DEFAULT 1.5,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )
`);

const DEFAULTS = {
  ema_fast: 12, ema_slow: 26,
  rsi_period: 14, rsi_overbought: 70, rsi_oversold: 30,
  macd_fast: 12, macd_slow: 26, macd_signal: 9,
  atr_multiplier: 1.5,
};

// GET /api/settings — the logged-in subscriber's own strategy parameters
router.get('/', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM strategy_settings WHERE user_id = ?').get(req.user.id);
  res.json({ settings: row || { user_id: req.user.id, ...DEFAULTS } });
});

// POST /api/settings — save/update the subscriber's own parameters
router.post('/', requireAuth, (req, res) => {
  const s = { ...DEFAULTS, ...req.body };
  db.prepare(`
    INSERT INTO strategy_settings
      (user_id, ema_fast, ema_slow, rsi_period, rsi_overbought, rsi_oversold, macd_fast, macd_slow, macd_signal, atr_multiplier, updated_at)
    VALUES
      (@user_id, @ema_fast, @ema_slow, @rsi_period, @rsi_overbought, @rsi_oversold, @macd_fast, @macd_slow, @macd_signal, @atr_multiplier, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      ema_fast=excluded.ema_fast, ema_slow=excluded.ema_slow,
      rsi_period=excluded.rsi_period, rsi_overbought=excluded.rsi_overbought, rsi_oversold=excluded.rsi_oversold,
      macd_fast=excluded.macd_fast, macd_slow=excluded.macd_slow, macd_signal=excluded.macd_signal,
      atr_multiplier=excluded.atr_multiplier, updated_at=CURRENT_TIMESTAMP
  `).run({ user_id: req.user.id, ...s });
  res.json({ ok: true });
});

// GET /api/settings/all — admin view of every subscriber's parameters
router.get('/all', requireAdmin, (req, res) => {
  const rows = db.prepare(`
    SELECT u.id as user_id, u.name, u.email, u.plan, s.*
    FROM users u LEFT JOIN strategy_settings s ON s.user_id = u.id
    ORDER BY u.created_at DESC
  `).all();
  res.json({ settings: rows });
});

module.exports = router;
