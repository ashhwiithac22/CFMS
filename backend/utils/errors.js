class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400);
    this.errors = errors;
  }
}

class AuthError extends AppError {
  constructor(message) {
    super(message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message) {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404);
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError
};
