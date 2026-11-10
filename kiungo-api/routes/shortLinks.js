// routes/shortLinks.js
const express = require('express');
const { requireUser } = require('../middleware/auth');
const { createLimiter, strictLimiter, viewClickLimiter } = require('../middleware/rateLimit');
const shortLinksService = require('../services/shortLinksService');

const router = express.Router();

function scriptJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

router.get('/analytics/overview', requireUser, async (req, res, next) => {
  try {
    res.json(await shortLinksService.getAnalyticsOverview(req.userId));
  } catch (error) {
    next(error);
  }
});

router.get('/short-links', requireUser, async (req, res, next) => {
  try {
    res.json(await shortLinksService.getMyShortLinks(req.userId));
  } catch (error) {
    next(error);
  }
});

router.post('/short-links', requireUser, createLimiter, async (req, res, next) => {
  try {
    res.status(201).json(await shortLinksService.createShortLink(req.userId, req.body));
  } catch (error) {
    next(error);
  }
});

router.patch('/short-links/:id', requireUser, strictLimiter, async (req, res, next) => {
  try {
    res.json(await shortLinksService.updateShortLink(req.userId, req.params.id, req.body));
  } catch (error) {
    next(error);
  }
});

router.delete('/short-links/:id', requireUser, strictLimiter, async (req, res, next) => {
  try {
    res.json(await shortLinksService.deleteShortLink(req.userId, req.params.id));
  } catch (error) {
    next(error);
  }
});

// Public redirect endpoint. It is deliberately separate from profile button clicks.
router.get('/r/:code', viewClickLimiter, async (req, res, next) => {
  try {
    const result = await shortLinksService.resolveShortLink(req.params.code, {
      referrer: req.get('referer') || '',
      userAgent: req.get('user-agent') || '',
    });
    if (!result) return res.status(404).send('This Kiungo link is unavailable.');

    res.set('Cache-Control', 'no-store');
    res.redirect(302, result.destination);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
