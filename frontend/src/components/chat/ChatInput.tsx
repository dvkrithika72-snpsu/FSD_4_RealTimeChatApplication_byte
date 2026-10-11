import React, { useState, useRef } from 'react';
import api from '../../services/api';

interface ChatInputProps {
  onSendMessage: (content: string, attachment?: { url: string, type: string, name: string }) => void;
  onTyping?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, onTyping }) => {
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const emojis = ['😀', '😂', '🥰', '😎', '😭', '😡', '👍', '🙏', '🔥', '✨', '🎉', '❤️'];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    if (onTyping) onTyping();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !file) return;

    let attachment;
    if (file) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        // The baseURL in api is likely /api, so we hit /upload -> /api/upload
        const res = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        attachment = res.data;
      } catch (err) {
        console.error('Failed to upload file', err);
        setUploading(false);
        return; // handle error better in real app
      }
      setUploading(false);
    }

    onSendMessage(message, attachment);
    setMessage('');
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div style={{ padding: '20px', borderTop: '1px solid var(--nexus-border)', background: 'transparent' }}>
      {file && (
        <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(59, 130, 246, 0.1)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
          <span style={{ color: '#f8fafc', fontSize: '0.85rem', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            📎 {file.name}
          </span>
          <button onClick={() => setFile(null)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
        </div>
      )}
      <form 
        onSubmit={handleSubmit} 
        style={{ 
          display: 'flex', 
          background: 'rgba(2, 6, 23, 0.5)', 
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '32px',
          padding: '6px 10px',
          boxShadow: '0 0 20px rgba(0,0,0,0.2)',
          position: 'relative'
        }}
      >
        {showEmojis && (
          <div style={{
            position: 'absolute', bottom: '110%', left: '0', 
            background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '12px', padding: '10px', display: 'grid', 
            gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', 
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 100
          }}>
            {emojis.map(emoji => (
              <span 
                key={emoji} 
                onClick={() => { setMessage(prev => prev + emoji); setShowEmojis(false); }}
                style={{ cursor: 'pointer', fontSize: '1.2rem', padding: '4px', textAlign: 'center', transition: 'transform 0.1s' }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                {emoji}
              </span>
            ))}
          </div>
        )}
        <span 
          onClick={() => setShowEmojis(!showEmojis)}
          style={{ display: 'flex', alignItems: 'center', padding: '0 15px', color: showEmojis ? '#3b82f6' : '#94a3b8', fontSize: '1.2rem', cursor: 'pointer', transition: 'color 0.2s' }}
        >
          😀
        </span>
        <input
          type="text"
          value={message}
          onChange={handleChange}
          placeholder={file ? "Add a message (optional)..." : "Type a message..."}
          style={{ 
            flex: 1, 
            background: 'transparent', 
            border: 'none', 
            color: '#f8fafc',
            outline: 'none',
            padding: '10px 5px',
            fontSize: '0.95rem'
          }}
          disabled={uploading}
        />
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileChange}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', paddingRight: '5px' }}>
          <span 
            onClick={() => fileInputRef.current?.click()}
            style={{ color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem', transform: 'rotate(45deg)' }}
          >
            📎
          </span>
          <button 
            type="submit" 
            disabled={(!message.trim() && !file) || uploading}
            style={{ 
              background: (message.trim() || file) ? 'linear-gradient(135deg, rgba(30,58,138,0.9), rgba(59,130,246,0.9))' : 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: (!message.trim() && !file) || uploading ? 'default' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: (message.trim() || file) ? '0 0 15px rgba(59,130,246,0.5)' : 'none'
            }}
          >
            {uploading ? '⌛' : '➤'}
          </button>
        </div>
      </form>
    </div>
  );
};
