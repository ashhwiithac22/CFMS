import React, { useRef, useEffect } from 'react';
import { MessageSquare, X } from 'lucide-react';

const MessagePanel = ({ 
  replyToComplaint, 
  messageText, 
  setMessageText, 
  onSubmit, 
  onClose,
  messages = [],
  currentUserId
}) => {
  const scrollRef = useRef(null);

  // Auto scroll to bottom of thread on message update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!replyToComplaint) return null;

  // Recipient matches complaint raiser
  const recipientRole = replyToComplaint.raisedBy === 'System Admin' ? 'Administrator' : 'Sales Executive';

  return (
    <section 
      style={{ 
        padding: '16px', 
        borderRadius: '12px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px', 
        position: 'relative',
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--inprogress-bg)', // Dynamic blue tint background matching status colors
        boxSizing: 'border-box',
        width: '100%',
        marginTop: '8px',
        marginBottom: '16px'
      }}
      className="animate-fade-in-up"
    >
      {/* Close button icon top-right */}
      <button 
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          padding: '4px',
          borderRadius: '6px',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        type="button"
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        <X size={16} />
      </button>

      {/* Header Info */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          fontSize: '12px', 
          fontWeight: 'bold', 
          color: 'var(--text-primary)', 
          userSelect: 'none' 
        }}
      >
        <MessageSquare size={14} style={{ color: 'var(--brand-primary)' }} />
        <span>Message to {recipientRole}</span>
        <span style={{ opacity: 0.4 }}>—</span>
        <span>{replyToComplaint.id} / {replyToComplaint.customer}</span>
      </div>

      {/* Message Thread List (Chat style) */}
      {messages.length > 0 && (
        <div 
          ref={scrollRef}
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px', 
            maxHeight: '180px', 
            overflowY: 'auto', 
            padding: '12px', 
            backgroundColor: 'var(--bg-primary)', 
            borderRadius: '8px', 
            border: '1px solid var(--border-color)',
            boxSizing: 'border-box'
          }}
          className="scrollbar-thin"
        >
          {messages.map(m => {
            const isMe = m.sender_id === currentUserId;
            return (
              <div 
                key={m.id} 
                style={{ 
                  alignSelf: isMe ? 'flex-end' : 'flex-start', 
                  backgroundColor: isMe ? 'var(--bg-secondary)' : 'var(--bg-primary)', 
                  border: '1px solid var(--border-color)',
                  padding: '8px 12px', 
                  borderRadius: '12px', 
                  maxWidth: '75%', 
                  fontSize: '12px', 
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  boxShadow: 'var(--shadow-sm)',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ fontWeight: '800', color: isMe ? 'var(--brand-primary)' : 'var(--inprogress-text)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  {m.first_name} {m.last_name} ({m.sender_role})
                </div>
                <div style={{ color: 'var(--text-primary)', lineHeight: 1.4 }}>{m.message_text}</div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', textAlign: 'right', marginTop: '2px' }}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Input reply form with 44px tap targets */}
      <form onSubmit={onSubmit} style={{ display: 'flex', gap: '12px', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>
        <input
          type="text"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Type your update or query here..."
          style={{ 
            flex: 1, 
            padding: '12px 16px', 
            borderRadius: '8px', 
            border: '1px solid var(--border-color)',
            outline: 'none',
            fontSize: '13px',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            minHeight: '44px',
            boxSizing: 'border-box'
          }}
          required
        />
        <button 
          type="submit"
          style={{ 
            padding: '0 24px', 
            color: '#FFFFFF', 
            fontSize: '13px', 
            fontWeight: 'bold', 
            borderRadius: '8px', 
            border: 'none',
            backgroundColor: 'var(--brand-primary)', 
            cursor: 'pointer',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
            transition: 'opacity 0.15s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          Send
        </button>
      </form>

    </section>
  );
};

export default MessagePanel;
