// routes/links.js
const express = require('express');
const { viewClickLimiter } = require('../middleware/rateLimit');
const profileService = require('../services/profileService');

const router = express.Router();

router.post('/links/:id/click', viewClickLimiter, async (req, res, next) => {
  try {
    const result = await profileService.incrementClick(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;