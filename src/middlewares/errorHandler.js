'use strict';

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  let status = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'Internal server error.';

  if (error.isOperational) {
    status = error.status;
    code = error.code;
    message = error.message;
  } else if (error.name === 'SequelizeUniqueConstraintError') {
    status = 409;
    code = 'UNIQUE_CONSTRAINT_VIOLATION';
    message = 'A resource with the supplied unique value already exists.';
  } else if (error.name === 'SequelizeForeignKeyConstraintError') {
    status = 409;
    code = 'FOREIGN_KEY_CONSTRAINT_VIOLATION';
    message = 'The resource is referenced by other records and cannot be deleted.';
  } else if (error.name === 'SequelizeValidationError') {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = 'The supplied data is invalid.';
  } else if (error.status === 503) {
    status = 503;
    code = 'DATABASE_UNAVAILABLE';
    message = 'Database unavailable.';
  } else if (error.status === 400) {
    status = 400;
    code = 'BAD_REQUEST';
    message = 'Invalid request.';
  }

  console.error('Request failed:', error.name || 'Error', error.code || 'UNKNOWN');

  return res.status(status).json({
    error: {
      code,
      message
    }
  });
}

module.exports = errorHandler;
