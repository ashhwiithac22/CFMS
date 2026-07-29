import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const QuickMessageBar = ({ selectedComplaint, onMessageSent, isMobile }) => {
  const { user } = useAuth();
  const [messageText, setMessageText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Auto-hide toast after 2 seconds
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!selectedComplaint || !messageText.trim() || isSending) return;

    setIsSending(true);
    // Recipient matches raisedBy (if System Admin/Executive, direct to Administrator/Sales Executive)
    const recipientRole = selectedComplaint.raisedBy === 'System Admin' ? 'Administrator' : 'Sales Executive';

    try {
      const res = await api.post('/messages', {
        complaint_id: selectedComplaint.id,
        message_text: messageText.trim(),
        recipient_role: recipientRole
      });

      if (res.ok) {
        setMessageText('');
        setShowToast(true);
        if (onMessageSent) {
          onMessageSent(selectedComplaint.id);
        }
      }
    } catch (err) {
      console.error('Failed to send quick message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const isButtonDisabled = !selectedComplaint || !messageText.trim() || isSending;

  // Layout parameters: offset by 220px sidebar on desktop/tablet, full-width on mobile
  const leftOffset = isMobile ? '0' : '220px';

  return (
    <>
      {/* Toast Notification sent above the bar */}
      {showToast && (
        <div 
          style={{
            position: 'fixed',
            bottom: '76px', // 12px above the 64px bar
            left: `calc(${leftOffset} + 24px)`,
            backgroundColor: 'var(--completed-bg)',
            border: '1px solid var(--border-color)',
            color: 'var(--completed-text)',
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            zIndex: 1400,
            animation: 'slide-up-fade 200ms ease'
          }}
        >
          <CheckCircle2 size={16} style={{ color: 'var(--completed-text)' }} />
          <span>Message sent</span>
        </div>
      )}

      {/* Persistent Quick Message Input Bar */}
      <div 
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
          animation: 'slide-up-entrance 250ms ease',
          userSelect: 'none'
        }}
      >
        {/* 1. Context Chip on the far left */}
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

        {/* 2. Text Input */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder={selectedComplaint ? "Type your message here..." : "Click a row in the table to select a complaint..."}
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

        {/* 3. Send Message Button */}
        <button
          onClick={handleSend}
          disabled={isButtonDisabled}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            height: '40px',
            padding: '0 20px',
            backgroundColor: isButtonDisabled ? 'var(--bg-secondary)' : 'var(--brand-primary)',
            color: isButtonDisabled ? 'var(--text-muted)' : '#FFFFFF',
            fontWeight: 'bold',
            fontSize: '14px',
            borderRadius: '8px',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
            transition: 'background-color 150ms ease, opacity 150ms ease',
            opacity: isButtonDisabled ? 0.55 : 1,
            boxSizing: 'border-box'
          }}
          type="button"
        >
          <Send size={16} style={{ color: isButtonDisabled ? 'var(--text-muted)' : '#FFFFFF' }} />
          <span>Send Message</span>
        </button>
      </div>

      {/* Embed Keyframe animations directly */}
      <style>{`
        @keyframes slide-up-entrance {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes slide-up-fade {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default QuickMessageBar;
