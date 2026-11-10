// middleware/errorHandler.js
const config = require('../config');

function notFound(req, res, next) {
  res.status(404).json({ error: 'Endpoint not found' });
}

function errorHandler(err, req, res, next) {
  console.error('[API Error]', err.message || err);

  const status = err.status || 500;
  const message =
    config.isProd && status === 500
      ? 'Internal server error'
      : err.message || 'Something went wrong';

  res.status(status).json({ error: message });
}

module.exports = { notFound, errorHandler };