const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Log the error using our custom logger
  logger.error(`Error: ${err.message}`, { stack: err.stack, path: req.path, method: req.method, ip: req.ip });

  // Determine status code and message
  const statusCode = err.statusCode || 500; // Default to 500 Internal Server Error
  const message = err.message || 'Internal Server Error';

  // Send standardized error response
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    // In development, send stack trace for debugging
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
