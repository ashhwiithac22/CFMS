const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const reportController = require('../controllers/report.controller');

// Explicit Role-Based Report Endpoints
router.get('/sales-executive', authMiddleware, reportController.getSalesExecutiveReport);
router.get('/warehouse-team', authMiddleware, reportController.getWarehouseTeamReport);
router.get('/warehouse-manager', authMiddleware, reportController.getWarehouseManagerReport);

// Default auto-detecting route
router.get('/', authMiddleware, reportController.getReportData);

module.exports = router;
