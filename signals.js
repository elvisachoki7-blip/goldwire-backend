const express = require('express');
const db = require('../db');
const { requireAuth } = require('./auth');
const { requireAdmin } = require('./admin');
const { sendMail, signalEmailHtml } = require('../email');

const router = express.Router();
const WEBHOOK_SECRET = process.env.MT5_WEBHOOK_SECRET || 'change-me-webhook-secret';

// Starter plan gets signals ~15 min delayed, matching the site's pricing copy.
const STARTER_DELAY_MS = 15 * 60 * 1000;

function createAndDispatchSignal({ instrument, direction, entry, stop_loss, take_profit, note, source }) {
  const info = db.prepare(`
    INSERT INTO signals (instrument, direction, entry, stop_loss, take_profit, note, source)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(instrument, direction, entry, stop_loss, take_profit, note || null, source || 'admin');

  const signal = db.prepare('SELECT * FROM signals WHERE id = ?').get(info.lastInsertRowid);
  const subscribers = db.prepare('SELECT id, name, email, plan FROM users').all();

  subscribers.forEach((user) => {
    const dispatch = () => {
      sendMail({
        to: user.email,
        subject: `${signal.instrument} ${signal.direction.toUpperCase()} signal`,
        html: signalEmailHtml(signal),
      }).catch((err) => console.error('Email send failed for', user.email, err.message));

      db.prepare(`
        INSERT INTO signal_deliveries (signal_id, user_id, status) VALUES (?, ?, 'sent')
      `).run(signal.id, user.id);
    };

    if (user.plan === 'starter') {
      setTimeout(dispatch, STARTER_DELAY_MS);
    } else {
      dispatch();
    }
  });

  return signal;
}

// POST /api/signals/webhook — for the MT5 EA to call directly.
// Header: x-webhook-secret: <MT5_WEBHOOK_SECRET>
router.post('/webhook', (req, res) => {
  if (req.headers['x-webhook-secret'] !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid webhook secret' });
  }
  const { instrument, direction, entry, stop_loss, take_profit, note } = req.body || {};
  if (!instrument || !direction || !entry || !stop_loss || !take_profit) {
    return res.status(400).json({ error: 'instrument, direction, entry, stop_loss, take_profit are required' });
  }
  const signal = createAndDispatchSignal({
    instrument, direction, entry, stop_loss, take_profit, note, source: 'mt5_ea',
  });
  res.status(201).json({ signal });
});

// POST /api/signals/admin — for the admin webpage.
router.post('/admin', requireAdmin, (req, res) => {
  const { instrument, direction, entry, stop_loss, take_profit, note } = req.body || {};
  if (!instrument || !direction || !entry || !stop_loss || !take_profit) {
    return res.status(400).json({ error: 'instrument, direction, entry, stop_loss, take_profit are required' });
  }
  const signal = createAndDispatchSignal({
    instrument, direction, entry, stop_loss, take_profit, note, source: 'admin',
  });
  res.status(201).json({ signal });
});

// GET /api/signals — subscriber's own signal history
router.get('/', requireAuth, (req, res) => {
  const signals = db.prepare('SELECT * FROM signals ORDER BY created_at DESC LIMIT 50').all();
  res.json({ signals });
});

// GET /api/signals/recent — for the admin panel's "recent signals" list
router.get('/recent', requireAdmin, (req, res) => {
  const signals = db.prepare('SELECT * FROM signals ORDER BY created_at DESC LIMIT 50').all();
  res.json({ signals });
});

module.exports = router;
