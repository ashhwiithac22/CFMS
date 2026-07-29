const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const RepositoryFactory = require('../repositories/repository.factory');

const messageRepo = RepositoryFactory.getMessageRepository();

// GET /api/messages/unread-count
// Returns unread messages count for current user role
router.get('/unread-count', authMiddleware, async (req, res, next) => {
  try {
    const role = req.user.role;
    const count = await messageRepo.getUnreadCount(role);
    res.status(200).json({
      success: true,
      data: { count }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/messages/thread/:complaint_id
// Returns message thread list for a complaint and marks incoming messages as read
router.get('/thread/:complaint_id', authMiddleware, async (req, res, next) => {
  try {
    const complaintId = req.params.complaint_id;
    const role = req.user.role;

    // Mark messages directed to this role as read
    await messageRepo.markAsRead(complaintId, role);

    // Fetch complete thread list
    const messages = await messageRepo.findByComplaintId(complaintId);
    res.status(200).json({
      success: true,
      data: { messages }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/messages
// Saves a new message to database
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { complaint_id, message_text, recipient_role, recipient_id } = req.body;
    const sender_id = req.user.userId;
    const sender_role = req.user.role;

    if (!complaint_id || !message_text) {
      return res.status(400).json({
        success: false,
        message: 'complaint_id and message_text are required'
      });
    }

    const messageId = await messageRepo.create({
      complaint_id,
      sender_id,
      sender_role,
      recipient_id,
      recipient_role,
      message_text,
      read_status: 'Unread'
    });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { messageId }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
