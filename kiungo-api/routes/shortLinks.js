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
    if (result.deepLink) {
      const deepLink = scriptJson(result.deepLink);
      const fallback = scriptJson(result.fallback);
      const fallbackHref = escapeHtml(result.fallback);
      res.type('html').send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Opening your link · Kiungo</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#111827;color:#f9fafb;font:16px system-ui,sans-serif}.card{max-width:360px;padding:32px;text-align:center}.dot{width:10px;height:10px;margin:0 auto 18px;border-radius:50%;background:#f97316;box-shadow:0 0 0 8px #f9731625}a{color:#fb923c}</style>
</head>
<body>
<main class="card"><div class="dot"></div><h1>Opening your app…</h1><p>If nothing happens, <a href="${fallbackHref}">continue to the website</a>.</p></main>
<script>
(function(){
  var deepLink = ${deepLink};
  var fallback = ${fallback};
  var timer = window.setTimeout(function(){
    if (!document.hidden) window.location.replace(fallback);
  }, 1400);
  document.addEventListener('visibilitychange', function(){
    if (document.hidden) window.clearTimeout(timer);
  });
  window.location.href = deepLink;
})();
</script>
</body>
</html>`);
      return;
    }

    res.redirect(302, result.destination);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
