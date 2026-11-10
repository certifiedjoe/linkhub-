// routes/profiles.js
const express = require('express');
const { requireUser } = require('../middleware/auth');
const { createLimiter, strictLimiter, viewClickLimiter } = require('../middleware/rateLimit');
const profileService = require('../services/profileService');

const router = express.Router();

router.get('/username-available', strictLimiter, async (req, res, next) => {
  try {
    const result = await profileService.checkUsernameAvailable(req.query.u);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireUser, async (req, res, next) => {
  try {
    const profiles = await profileService.getMyProfiles(req.userId);
    res.json(profiles);
  } catch (err) {
    next(err);
  }
});

router.get('/profiles', async (req, res, next) => {
  try {
    const profiles = await profileService.getShowcase(12);
    res.json(profiles);
  } catch (err) {
    next(err);
  }
});

router.get('/profiles/:username', async (req, res, next) => {
  try {
    const profile = await profileService.getPublicProfile(req.params.username, req.userId);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

router.post('/profiles', requireUser, createLimiter, async (req, res, next) => {
  try {
    const profile = await profileService.createProfile(req.userId, req.body);
    res.status(201).json(profile);
  } catch (err) {
    next(err);
  }
});

router.put('/profiles/:username', requireUser, async (req, res, next) => {
  try {
    const profile = await profileService.updateProfile(req.params.username, req.userId, req.body);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

router.delete('/profiles/:username', requireUser, async (req, res, next) => {
  try {
    const result = await profileService.deleteProfile(req.params.username, req.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/profiles/:username/view', viewClickLimiter, async (req, res, next) => {
  try {
    const result = await profileService.incrementView(req.params.username);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;