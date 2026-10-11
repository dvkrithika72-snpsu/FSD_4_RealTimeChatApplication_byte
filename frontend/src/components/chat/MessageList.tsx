import React, { useEffect, useRef } from 'react';
import type { IMessage } from '../../types/chat';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: IMessage[];
  onMarkRead: (messageId: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, onMarkRead }) => {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column' }}>
      {messages.map((msg) => (
        <MessageBubble key={msg._id} message={msg} onMarkRead={onMarkRead} />
      ))}
      {messages.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--nexus-text-muted)', marginTop: '20px', fontSize: '0.9rem' }}>
          No messages yet. Start the conversation!
        </div>
      )}
    </div>
  );
};
