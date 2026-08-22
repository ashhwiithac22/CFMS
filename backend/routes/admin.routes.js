const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const adminMiddleware = require('../middlewares/admin.middleware');
const adminController = require('../controllers/admin.controller');

// All admin routes require valid JWT auth + Administrator role
router.use(authMiddleware);
router.use(adminMiddleware);

// Operational Dashboard Endpoint
router.get('/dashboard', adminController.getDashboard);

// User Management Endpoints
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.patch('/users/:id/status', adminController.toggleUserStatus);
router.post('/users/:id/reset-password', adminController.resetUserPassword);

// Warehouse Management Endpoints
router.get('/warehouses', adminController.getWarehouses);
router.post('/warehouses', adminController.createWarehouse);
router.put('/warehouses/:id', adminController.updateWarehouse);
router.delete('/warehouses/:id', adminController.deleteWarehouse);

// Complaint Types & Subtypes Endpoints
router.get('/complaint-types', adminController.getComplaintTypes);
router.post('/complaint-types', adminController.createComplaintType);
router.post('/complaint-subtypes', adminController.createComplaintSubtype);

// System Settings & Dynamic SLA Endpoints
router.get('/settings', adminController.getSystemSettings);
router.put('/settings', adminController.updateSystemSettings);

module.exports = router;
