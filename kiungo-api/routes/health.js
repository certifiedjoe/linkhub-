// routes/health.js
const express = require('express');
const { authEnabled } = require('../middleware/auth');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true, authEnabled });
});

router.get('/session', (req, res) => {
  res.json({
    authEnabled,
    signedIn: Boolean(req.signedIn),
    userId: req.userId || null,
  });
});

module.exports = router;