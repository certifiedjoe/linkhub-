// Native app association documents. These must be served from the root of the
// same HTTPS host used by the links configured in Apple's/Google's consoles.
const express = require('express');
const router = express.Router();

router.get('/.well-known/apple-app-site-association', (req, res) => {
  const appId = String(process.env.IOS_APP_ID || '').trim();
  if (!/^[A-Z0-9]{10}\.[A-Za-z0-9.-]+$/.test(appId)) {
    return res.status(503).type('text/plain').send('iOS app association is not configured.');
  }
  res.set('Cache-Control', 'public, max-age=300');
  res.type('application/json').send({
    applinks: {
      apps: [],
      details: [{ appID: appId, paths: ['/api/r/*'] }],
    },
  });
});

router.get('/.well-known/assetlinks.json', (req, res) => {
  const packageName = String(process.env.ANDROID_PACKAGE_NAME || '').trim();
  const fingerprints = String(process.env.ANDROID_SHA256_CERT_FINGERPRINTS || '')
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter((value) => /^([A-F0-9]{2}:){31}[A-F0-9]{2}$/.test(value));
  if (!/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(packageName) || !fingerprints.length) {
    return res.status(503).type('text/plain').send('Android app association is not configured.');
  }
  res.set('Cache-Control', 'public, max-age=300');
  res.json([{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: { namespace: 'android_app', package_name: packageName, sha256_cert_fingerprints: fingerprints },
  }]);
});

module.exports = router;
