import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import './ActiveChatsList.css';

const ActiveChatsList = () => {
  const navigate = useNavigate();
  const { activeSupportChats, onlineUsers } = useSocket();

  const getOnlineStatus = (userId) => {
    return onlineUsers.some(u => u.userId === userId);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 60000); // minutos
    
    if (diff < 1) return 'agora';
    if (diff < 60) return `${diff}min`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h`;
    return date.toLocaleDateString('pt-BR');
  };

  if (!activeSupportChats || activeSupportChats.length === 0) {
    return (
      <div className="active-chats-empty">
        <i className="fas fa-comments"></i>
        <p>Nenhum chat ativo no momento</p>
      </div>
    );
  }

  return (
    <div className="active-chats-container">
      <h3>
        <i className="fas fa-comments"></i>
        Chats Ativos ({activeSupportChats.length})
      </h3>
      
      <div className="active-chats-list">
        {activeSupportChats.map((chat) => (
          <div 
            key={chat.room}
            className="active-chat-item"
            onClick={() => navigate(`/dashboard/chat/${chat.room}`)}
          >
            <div className="chat-avatar">
              <i className="fas fa-user"></i>
              {getOnlineStatus(chat.userId) && (
                <span className="online-indicator" title="Online"></span>
              )}
            </div>
            
            <div className="chat-info">
              <div className="chat-header">
                <span className="chat-user">
                  {chat.userName || 'Usuário'}
                </span>
                {chat.lastMessage && (
                  <span className="chat-time">
                    {formatTime(chat.lastMessage.createdAt)}
                  </span>
                )}
              </div>
              
              <div className="chat-preview">
                {chat.lastMessage ? (
                  <p className="last-message">
                    {chat.lastMessage.senderName}: {chat.lastMessage.content}
                  </p>
                ) : (
                  <p className="no-messages">Nenhuma mensagem ainda</p>
                )}
              </div>
              
              {chat.unreadCount > 0 && (
                <span className="unread-badge">{chat.unreadCount}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActiveChatsList;