// app.js
const express = require('express');
const { securityMiddleware } = require('./middleware/security');
const { generalLimiter } = require('./middleware/rateLimit');
const { attachUser } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const routes = require('./routes');
const appAssociationRoutes = require('./routes/appAssociations');

const app = express();

app.set('trust proxy', 1);

app.use(securityMiddleware());
app.use(express.json({ limit: '6mb' }));
app.use(generalLimiter);
app.use(attachUser());
app.use(appAssociationRoutes); // Association documents must be served from the domain root.
app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;