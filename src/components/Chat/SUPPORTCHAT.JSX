import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import TransferModal from './TransferModal';
import './Chat.css';

const SupportChat = ({ room, userId, userName, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  
  const { 
    socket, 
    isConnected,
    sendMessage, 
    sendTyping,
    joinRoom,
    leaveRoom,
    transferSupport,
    getAvailableSupports,
    availableSupports
  } = useSocket();
  
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (room && isConnected) {
      joinRoom(room);
      
      return () => {
        leaveRoom(room);
      };
    }
  }, [room, isConnected, joinRoom, leaveRoom]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      if (msg.room === room) {
        setMessages(prev => [...prev, msg]);
      }
    };

    const handleMessageHistory = ({ room: historyRoom, messages: history }) => {
      if (historyRoom === room) {
        setMessages(history);
      }
    };

    socket.on('new-message', handleNewMessage);
    socket.on('message-history', handleMessageHistory);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('message-history', handleMessageHistory);
    };
  }, [socket, room]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (input.trim() && isConnected) {
      sendMessage(room, input);
      setInput('');
      
      if (isTyping) {
        sendTyping(room, false);
        setIsTyping(false);
      }
    }
  };

  const handleTyping = (e) => {
    setInput(e.target.value);
    
    if (!isTyping && e.target.value) {
      setIsTyping(true);
      sendTyping(room, true);
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        sendTyping(room, false);
      }
    }, 2000);
  };

  const handleTransfer = () => {
    getAvailableSupports();
    setShowTransferModal(true);
  };

  const handleTransferConfirm = (targetSupportId) => {
    transferSupport(room, targetSupportId, userId, userName);
    setShowTransferModal(false);
    onClose?.();
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <>
      <div className="support-chat-container">
        <div className="support-chat-header">
          <div className="support-chat-info">
            <h3>
              <i className="fas fa-user"></i>
              Atendendo: {userName}
            </h3>
            <span className="user-id">ID: {userId}</span>
          </div>
          
          <div className="support-chat-actions">
            <button 
              className="btn-transfer"
              onClick={handleTransfer}
              title="Transferir chamado"
            >
              <i className="fas fa-exchange-alt"></i>
              Transferir
            </button>
            <button 
              className="btn-end"
              onClick={onClose}
              title="Encerrar atendimento"
            >
              <i className="fas fa-times"></i>
              Encerrar
            </button>
          </div>
        </div>

        <div className="support-chat-messages">
          {messages.map((msg, idx) => (
            <div 
              key={msg._id || idx} 
              className={`message ${msg.sender === user?._id ? 'own' : ''} ${msg.isSystem ? 'system' : ''}`}
            >
              {!msg.isSystem && (
                <div className="message-header">
                  <strong>{msg.senderName}</strong>
                  {msg.senderRole === 'SUPPORT' && (
                    <span className="support-tag">Suporte</span>
                  )}
                </div>
              )}
              <div className="message-content">
                <p>{msg.content}</p>
              </div>
              <div className="message-time">
                {formatTime(msg.createdAt)}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="support-chat-input">
          <input
            type="text"
            value={input}
            onChange={handleTyping}
            placeholder="Digite sua mensagem..."
            disabled={!isConnected}
          />
          <button type="submit" disabled={!input.trim() || !isConnected}>
            <i className="fas fa-paper-plane"></i>
            Enviar
          </button>
        </form>
      </div>

      {showTransferModal && (
        <TransferModal
          supports={availableSupports}
          onConfirm={handleTransferConfirm}
          onClose={() => setShowTransferModal(false)}
        />
      )}
    </>
  );
};

export default SupportChat;