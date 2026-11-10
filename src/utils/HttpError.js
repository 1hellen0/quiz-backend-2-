'use strict';

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.isOperational = true;
  }
}

module.exports = HttpError;
