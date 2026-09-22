import express from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger.js';
import { registerRoutes } from './routes.js';

export const app = express();

// Middleware to add request ID
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      event: 'http_request',
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      requestId: req.id
    });
  });
  next();
});

app.use(express.json());

// Register routes
registerRoutes(app);

// Central error handling
app.use((err, req, res, next) => {
  logger.error({
    event: 'unhandled_error',
    error: err.message,
    stack: err.stack,
    requestId: req.id
  });
  
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      requestId: req.id
    }
  });
});
