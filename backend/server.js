require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const { connectDB } = require('./config/db');
const { helmet, cors, apiLimiter } = require('./middlewares/security.middleware');
const authRoutes = require('./routes/auth.routes');
const messageRoutes = require('./routes/message.routes');
const { AppError } = require('./utils/errors');

const app = express();
const PORT = process.env.PORT || 5000;

// Logging middleware
app.use(morgan('dev'));

// Security & Parsers
app.use(helmet);
app.use(cors);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Global API rate limiter for non-auth requests
app.use('/api/', (req, res, next) => {
  // Exclude auth routes from general rate limiter since they use authLimiter
  if (req.path.startsWith('/auth')) {
    return next();
  }
  apiLimiter(req, res, next);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date()
  });
});

// Catch-all route for unmatched paths (404)
app.use('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  console.error('SERVER_ERROR:', {
    message: err.message,
    stack: err.stack,
    errors: err.errors
  });

  res.status(err.statusCode).json({
    success: false,
    status: err.status,
    message: err.isOperational ? err.message : 'Internal server error occurred',
    errors: err.errors || undefined
  });
});

// Database connection & Server startup
async function startServer() {
  try {
    // Connect to database and run schema/seeds
    try {
      await connectDB();
    } catch (dbErr) {
      console.warn('WARNING: Database connection failed. Running server in-memory fallback mode.', dbErr.message);
    }

    app.listen(PORT, () => {
      console.log(`Backend server is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Critical Error: Failed to start backend server.', err.message);
    process.exit(1);
  }
}

startServer();
