const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

// Rate limiting setup for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // limit each IP to 15 login/register requests per windowMs
  message: {
    status: 429,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// General rate limiter for non-auth requests
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    status: 429,
    message: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS config
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173', // Vite default port
  credentials: true, // Allow cookie transmission
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

module.exports = {
  helmet: helmet(),
  cors: cors(corsOptions),
  authLimiter,
  apiLimiter
};
