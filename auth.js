const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const ALLOWED_PLANS = new Set(['starter', 'pro', 'elite']);
const attempts = new Map();

function authRateLimit(req, res, next) {
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  const current = attempts.get(key) || {
    count: 0,
    resetAt: now + 15 * 60 * 1000,
  };

  if (now > current.resetAt) {
    current.count = 0;
    current.resetAt = now + 15 * 60 * 1000;
  }

  current.count += 1;
  attempts.set(key, current);

  if (current.count > 12) {
    return res
      .status(429)
      .json({ error: 'Too many attempts. Please try again in 15 minutes.' });
  }

  next();
}

function validCredentials({ name, email, password, plan }) {
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const cleanPlan = typeof plan === 'string' ? plan.toLowerCase() : 'starter';

  if (cleanName.length < 2 || cleanName.length > 80) {
    return { error: 'Please enter a name between 2 and 80 characters.' };
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) ||
    cleanEmail.length > 254
  ) {
    return { error: 'Please enter a valid email address.' };
  }

  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return { error: 'Password must be between 8 and 128 characters.' };
  }

  if (!ALLOWED_PLANS.has(cleanPlan)) {
    return { error: 'Invalid plan selected.' };
  }

  return {
    name: cleanName,
    email: cleanEmail,
    password,
    plan: cleanPlan,
  };
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, plan: user.plan },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

router.post('/signup', authRateLimit, (req, res) => {
  const input = validCredentials(req.body || {});
  if (input.error) return res.status(400).json({ error: input.error });

  const { name, email, password, plan } = input;
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

  if (existing) {
    return res.status(409).json({
      error: 'An account with that email already exists',
    });
  }

  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare(
      'INSERT INTO users (name, email, password_hash, plan) VALUES (?, ?, ?, ?)'
    )
    .run(name, email, hash, plan);

  const user = {
    id: info.lastInsertRowid,
    email,
    plan,
  };

  const token = signToken(user);

  res.status(201).json({
    token,
    user: {
      name,
      email: user.email,
      plan: user.plan,
    },
  });
});

router.post('/login', authRateLimit, (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      error: 'email and password are required',
    });
  }

  const normalizedEmail =
    typeof email === 'string' ? email.trim().toLowerCase() : '';

  const user = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(normalizedEmail);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signToken(user);

  res.json({
    token,
    user: {
      name: user.name,
      email: user.email,
      plan: user.plan,
    },
  });
});

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

router.get('/me', requireAuth, (req, res) => {
  const user = db
    .prepare(
      'SELECT name, email, plan, created_at FROM users WHERE id = ?'
    )
    .get(req.user.id);

  res.json({ user });
});

module.exports = { router, requireAuth };
