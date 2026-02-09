const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { initDb } = require('./services/db');

const extractRoute = require('./routes/extract');
const submitRoute = require('./routes/submit');
const casesRoute = require('./routes/cases');
const settingsRoute = require('./routes/settings');

const app = express();

// Security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      mediaSrc: ["'self'", "blob:"],
    }
  }
}));
app.use(cors());

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  message: { error: 'Too many requests, please try again later' }
});
app.use('/api/', apiLimiter);

// Body parsing
app.use(express.json({ limit: '15mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// API routes
app.use('/api/extract', extractRoute);
app.use('/api/submit', submitRoute);
app.use('/api/cases', casesRoute);
app.use('/api/settings', settingsRoute);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch-all: serve index.html for PWA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Initialize database then start server
async function start() {
  if (config.databaseUrl) {
    try {
      await initDb();
      console.log('[DB] Connected to PostgreSQL');
    } catch (err) {
      console.error('[DB] Failed to initialize database:', err.message);
      process.exit(1);
    }
  } else {
    console.warn('[DB] No DATABASE_URL set — running without database (local dev mode)');
  }

  app.listen(config.port, () => {
    console.log(`CaseUploadApp server running on port ${config.port}`);
    console.log(`Open http://localhost:${config.port} in your browser`);
  });
}

start();
