// routes/index.js
const express = require('express');
const healthRoutes = require('./health');
const profileRoutes = require('./profiles');
const linkRoutes = require('./links');

const router = express.Router();

router.use(healthRoutes);
router.use(profileRoutes);
router.use(linkRoutes);

module.exports = router;