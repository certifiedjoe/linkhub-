// routes/index.js
const express = require('express');
const healthRoutes = require('./health');
const profileRoutes = require('./profiles');
const linkRoutes = require('./links');
const shortLinkRoutes = require('./shortLinks');

const router = express.Router();

router.use(healthRoutes);
router.use(profileRoutes);
router.use(linkRoutes);
router.use(shortLinkRoutes);

module.exports = router;