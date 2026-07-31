const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');
const RepositoryFactory = require('../repositories/repository.factory');

const messageRepo = RepositoryFactory.getMessageRepository();

// GET /api/messages/unread-count
router.get('/unread-count', authMiddleware, async (req, res, next) => {
  try {
    const count = await messageRepo.getUnreadCount(req.user.userId, req.user.role);
    res.status(200).json({
      success: true,
      data: { count }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/messages/notifications
// Returns recent message notifications for logged in user
router.get('/notifications', authMiddleware, async (req, res, next) => {
  try {
    const notifications = await messageRepo.getNotificationsForUser(req.user.userId, req.user.role);
    res.status(200).json({
      success: true,
      data: { notifications }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/messages/recipients/:complaint_id
// Returns eligible recipients for a complaint based on lifecycle status and warehouse_id
router.get('/recipients/:complaint_id', authMiddleware, async (req, res, next) => {
  try {
    const complaintId = req.params.complaint_id;
    const userId = req.user.userId;
    const role = req.user.role;

    const data = await messageRepo.getRecipientsForComplaint(complaintId, userId, role);
    res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/messages/thread/:complaint_id?recipient_id=...
router.get('/thread/:complaint_id', authMiddleware, async (req, res, next) => {
  try {
    const complaintId = req.params.complaint_id;
    const userId = req.user.userId;
    const role = req.user.role;
    const recipientId = req.query.recipient_id ? parseInt(req.query.recipient_id, 10) : null;

    // Mark messages directed to this user as read
    await messageRepo.markAsRead(complaintId, userId, role);

    // Fetch thread list scoped to recipient and user
    const messages = await messageRepo.findByComplaintId(complaintId, userId, role, recipientId);
    res.status(200).json({
      success: true,
      data: { messages }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/messages
router.post('/', authMiddleware, (req, res, next) => {
  upload.single('attachment')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload error'
      });
    }

    let attachment_url = null;
    let uploadedFilePath = null;

    try {
      const { complaint_id, message_text, recipient_id } = req.body;
      const sender_id = req.user.userId;
      const sender_role = req.user.role;

      if (req.file) {
        uploadedFilePath = req.file.path;
        // Verify file was written to disk successfully
        if (!fs.existsSync(uploadedFilePath)) {
          return res.status(500).json({
            success: false,
            message: 'Attachment file upload failed to write to disk'
          });
        }
        attachment_url = `/uploads/${req.file.filename}`;
      }

      if (!complaint_id || (!message_text && !attachment_url)) {
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);
        return res.status(400).json({
          success: false,
          message: 'complaint_id and message_text or image attachment are required'
        });
      }

      if (!recipient_id) {
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);
        return res.status(400).json({
          success: false,
          message: 'recipient_id is required'
        });
      }

      // Backend Rule Validation
      const validatedRecipient = await messageRepo.validateMessageRules(complaint_id, sender_id, sender_role, recipient_id);

      const messageId = await messageRepo.create({
        complaint_id,
        sender_id,
        sender_role,
        recipient_id: validatedRecipient.recipient_id,
        recipient_role: validatedRecipient.recipient_role,
        message_text: message_text || '',
        attachment_url,
        read_status: 'Unread'
      });

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: { messageId, attachment_url }
      });
    } catch (ruleErr) {
      // Clean up uploaded file if validation or database insertion failed
      if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        try { fs.unlinkSync(uploadedFilePath); } catch (e) {}
      }
      res.status(400).json({
        success: false,
        message: ruleErr.message || 'Messaging validation failed'
      });
    }
  });
});

module.exports = router;
