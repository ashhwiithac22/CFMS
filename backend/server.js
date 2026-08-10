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
const PORT = process.env.PORT || 4000;

const path = require('path');

// Logging middleware
app.use(morgan('dev'));

// Security & Parsers
app.use(helmet);
app.use(cors);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static uploaded attachments with CORS headers
app.use('/uploads', cors, express.static(path.join(__dirname, 'uploads')));

// Global API rate limiter for non-auth requests
app.use('/api/', (req, res, next) => {
  // Exclude auth routes from general rate limiter since they use authLimiter
  if (req.path.startsWith('/auth')) {
    return next();
  }
  apiLimiter(req, res, next);
});

const complaintRoutes = require('./routes/complaint.routes');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/complaints', complaintRoutes);

// Health check & root endpoints
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Customer Feedback Management System (CFMS) API Server is running',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      messages: '/api/messages'
    }
  });
});

app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CFMS API Endpoints',
    routes: ['/api/auth', '/api/messages']
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date()
  });
});

// Silently ignore favicon.ico requests (browser auto-requests it)
app.use('/favicon.ico', (req, res) => res.status(204).end());

// Catch-all route for unmatched paths (404)
app.use('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Only log real server errors (5xx), not expected 404s
  if (err.statusCode >= 500) {
    console.error('SERVER_ERROR:', {
      message: err.message,
      stack: err.stack,
      errors: err.errors
    });
  }

  res.status(err.statusCode).json({
    success: false,
    status: err.status,
    message: err.isOperational ? err.message : 'Internal server error occurred',
    errors: err.errors || undefined
  });
});

const { verifySmtp } = require('./config/mailer');

// Database connection & Server startup
async function startServer() {
  try {
    // Connect to database and run schema/seeds
    try {
      await connectDB();
      await verifySmtp();
    } catch (dbErr) {
      if (process.env.ALLOW_MOCK_DB === 'true') {
        console.warn('===================================================================');
        console.warn('WARNING: Database connection failed. ALLOW_MOCK_DB=true is set.');
        console.warn('Running server in IN-MEMORY MOCK FALLBACK MODE.', dbErr.message);
        console.warn('===================================================================');
      } else {
        console.error('===================================================================');
        console.error('FATAL DATABASE ERROR: Refusing to start server in silent mock mode.');
        console.error(`Error Details: ${dbErr.message}`);
        console.error('Please verify SQL Server is running and port configuration is correct.');
        console.error('To explicitly enable mock mode for testing, set ALLOW_MOCK_DB=true in .env');
        console.error('===================================================================');
        process.exit(1);
      }
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
