import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';

const NotificationItem = ({ notification, onMarkAsRead }) => {
  const navigate = useNavigate();
  const { acceptSupportRequest, getAvailableSupports } = useSocket();

  const getIcon = (type) => {
    switch(type) {
      case 'support_request': return 'fas fa-headset';
      case 'support_accepted': return 'fas fa-check-circle';
      case 'success': return 'fas fa-check-circle';
      case 'warning': return 'fas fa-exclamation-triangle';
      case 'error': return 'fas fa-times-circle';
      case 'message': return 'fas fa-comment';
      case 'info':
      default: return 'fas fa-info-circle';
    }
  };

  const getIconColor = (type) => {
    switch(type) {
      case 'support_request': return '#f39c12';
      case 'support_accepted': return '#27ae60';
      case 'success': return '#27ae60';
      case 'warning': return '#f39c12';
      case 'error': return '#e74c3c';
      case 'message': return '#3498db';
      default: return '#3498db';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'agora mesmo';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min atrás`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} h atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  const handleAccept = (e) => {
    e.stopPropagation();
    console.log('🎯 Aceitando solicitação:', notification);
    
    if (notification.data) {
      const room = acceptSupportRequest(
        notification.data.id, 
        notification.data.userId,
        notification.data.userName
      );
      
      if (room) {
        if (notification.id) onMarkAsRead(notification.id);
        
        setTimeout(() => {
          navigate('/dashboard/chat');
        }, 500);
      }
    }
  };

  const handleTransfer = (e) => {
    e.stopPropagation();
    console.log('🔄 Abrindo modal de transferência para:', notification);
    
    if (notification.data) {
      getAvailableSupports();
      
      localStorage.setItem('transferData', JSON.stringify({
        userId: notification.data.userId,
        userName: notification.data.userName
      }));
      
      if (notification.id) onMarkAsRead(notification.id);
      
      navigate('/dashboard/chat?transfer=true');
    }
  };

  const handleClick = () => {
    if (!notification.read && notification.id) {
      onMarkAsRead(notification.id);
    }
    
    if (notification.type === 'support_request' || notification.type === 'support_accepted') {
      navigate('/dashboard/chat');
    }
  };

  return (
    <div 
      className={`notification-item ${!notification.read ? 'unread' : ''}`}
      onClick={handleClick}
    >
      <div 
        className="notification-item-icon"
        style={{ backgroundColor: getIconColor(notification.type) }}
      >
        <i className={getIcon(notification.type)}></i>
      </div>
      
      <div className="notification-item-content">
        <div className="notification-item-header">
          <span className="notification-item-title">
            {notification.title || 'Notificação'}
          </span>
          <span className="notification-item-time">
            <i className="fas fa-clock"></i>
            {formatDate(notification.timestamp || notification.createdAt)}
          </span>
        </div>
        
        <p className="notification-item-message">{notification.message}</p>
        
        {notification.data && (
          <div className="notification-item-data">
            {notification.data.userName && (
              <span className="data-tag">
                <strong>Usuário:</strong> {notification.data.userName}
              </span>
            )}
            {notification.data.department && (
              <span className="data-tag">
                <strong>Departamento:</strong> {notification.data.department}
              </span>
            )}
          </div>
        )}

        {notification.type === 'support_request' && (
          <div className="notification-item-actions">
            <button 
              className="btn-action accept"
              onClick={handleAccept}
              title="Aceitar solicitação"
            >
              <i className="fas fa-check-circle"></i>
              Aceitar
            </button>
            <button 
              className="btn-action transfer"
              onClick={handleTransfer}
              title="Transferir chamado"
            >
              <i className="fas fa-exchange-alt"></i>
              Transferir
            </button>
          </div>
        )}
      </div>

      {!notification.read && notification.type !== 'support_request' && (
        <div className="notification-item-unread">
          <span className="unread-dot"></span>
        </div>
      )}
    </div>
  );
};

export default NotificationItem;