import React, { useState, useEffect, useRef } from 'react';
import { Send, CheckCircle2, Paperclip, X } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Button from './common/Button';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const QuickMessageBar = ({ selectedComplaint, onMessageSent, isMobile, attachmentFile, setAttachmentFile }) => {
  const { user } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const fileInputRef = useRef(null);
  
  const [messageText, setMessageText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [fileError, setFileError] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);

  // Auto-hide toast after 2 seconds
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // Generate preview URL when attachment changes
  useEffect(() => {
    if (attachmentFile) {
      const url = URL.createObjectURL(attachmentFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [attachmentFile]);

  const handleFileChange = (e) => {
    setFileError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFileError('Only image files (JPEG, PNG, GIF, WEBP) are allowed.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFileError('File size exceeds the 5MB maximum limit.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (setAttachmentFile) {
      setAttachmentFile(file);
    }
  };

  const removeAttachment = () => {
    if (setAttachmentFile) setAttachmentFile(null);
    setFileError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!selectedComplaint || (!messageText.trim() && !attachmentFile) || isSending) return;

    setIsSending(true);
    const recipientRole = selectedComplaint.raisedBy === 'System Admin' ? 'Administrator' : 'Sales Executive';

    try {
      const formData = new FormData();
      formData.append('complaint_id', selectedComplaint.id);
      formData.append('message_text', messageText.trim());
      formData.append('recipient_role', recipientRole);
      if (attachmentFile) {
        formData.append('attachment', attachmentFile);
      }

      const res = await api.postFormData('/messages', formData);

      if (res.ok) {
        setMessageText('');
        if (setAttachmentFile) setAttachmentFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setShowToast(true);
        if (onMessageSent) {
          onMessageSent(selectedComplaint.id);
        }
      } else {
        const data = await res.json();
        setFileError(data.message || 'Failed to send message.');
      }
    } catch (err) {
      console.error('Failed to send quick message:', err);
      setFileError('Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  const isButtonDisabled = !selectedComplaint || (!messageText.trim() && !attachmentFile) || isSending;
  const leftOffset = isMobile ? '0' : '220px';

  return (
    <>
      {/* Toast Notification sent above the bar */}
      <AnimatePresence>
        {(showToast || fileError) && (
          <motion.div 
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.95 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            style={{
              position: 'fixed',
              bottom: '76px',
              left: `calc(${leftOffset} + 24px)`,
              backgroundColor: fileError ? 'rgba(239, 68, 68, 0.95)' : 'var(--completed-bg)',
              border: fileError ? '1px solid #EF4444' : '1px solid var(--border-color)',
              color: fileError ? '#FFFFFF' : 'var(--completed-text)',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              zIndex: 1400
            }}
          >
            {fileError ? (
              <>
                <X size={16} style={{ color: '#FFFFFF' }} />
                <span>{fileError}</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} style={{ color: 'var(--completed-text)' }} />
                <span>Message sent successfully</span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent Quick Message Input Bar */}
      <motion.div 
        initial={shouldReduceMotion ? { opacity: 0 } : { y: 64, opacity: 0 }}
        animate={shouldReduceMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        style={{
          position: 'fixed',
          bottom: 0,
          left: leftOffset,
          right: 0,
          height: '64px',
          backgroundColor: 'var(--bg-floating)',
          borderTop: '1px solid var(--border-color)',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
          zIndex: 1000,
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxSizing: 'border-box',
          userSelect: 'none'
        }}
      >
        {/* Context Chip on the far left */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '16px',
            fontSize: '12px',
            fontWeight: 'bold',
            backgroundColor: selectedComplaint ? 'var(--card-selected-bg)' : 'var(--bg-secondary)',
            color: selectedComplaint ? 'var(--brand-primary)' : 'var(--text-muted)',
            border: selectedComplaint ? '1px solid var(--brand-primary)' : '1px solid var(--border-color)',
            whiteSpace: 'nowrap',
            maxWidth: isMobile ? '120px' : '280px',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {selectedComplaint ? (
            isMobile ? (
              <span>{selectedComplaint.id}</span>
            ) : (
              <span>{selectedComplaint.id} · {selectedComplaint.raisedBy}</span>
            )
          ) : (
            <span>Select a complaint to message</span>
          )}
        </div>

        {/* Paperclip attachment button */}
        <input 
          type="file" 
          ref={fileInputRef} 
          accept="image/*" 
          onChange={handleFileChange} 
          style={{ display: 'none' }} 
        />
        <button
          type="button"
          disabled={!selectedComplaint}
          onClick={() => fileInputRef.current?.click()}
          title="Attach image"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-primary)',
            color: selectedComplaint ? 'var(--text-primary)' : 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: selectedComplaint ? 'pointer' : 'not-allowed',
            flexShrink: 0
          }}
        >
          <Paperclip size={18} />
        </button>

        {/* Thumbnail Preview if file attached */}
        {previewUrl && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 8px', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
            <img src={previewUrl} alt="Preview" style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'cover' }} />
            <button type="button" onClick={removeAttachment} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, color: 'var(--text-muted)' }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Text Input */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            id="quick-message-input"
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder={selectedComplaint ? `Type message to ${selectedComplaint.raisedBy}...` : "Click a row in the table to select a complaint..."}
            disabled={!selectedComplaint}
            style={{
              width: '100%',
              height: '40px',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: isFocused ? '1px solid var(--brand-primary)' : '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0 14px',
              fontSize: '14px',
              outline: 'none',
              boxShadow: isFocused ? '0 0 0 3px rgba(30,79,217,0.1)' : 'none',
              transition: 'border-color 150ms ease, box-shadow 150ms ease',
              boxSizing: 'border-box',
              cursor: selectedComplaint ? 'text' : 'not-allowed'
            }}
          />
        </div>

        {/* Send Message Button */}
        <Button
          onClick={handleSend}
          disabled={isButtonDisabled}
          loading={isSending}
          variant="primary"
          size="md"
          icon={<Send size={16} />}
        >
          Send Message
        </Button>
      </motion.div>
    </>
  );
};

export default QuickMessageBar;
