import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import Sidebar from './Sidebar';
import NotificationBell from './Notifications/NotificationBell';
import Home from './Home';
import CollectionPoints from './CollectionPoints';
import RegisterCollection from './RegisterCollection';
import RoutesList from './Routes';
import OptimizedRoutes from './OptimizedRoutes';
import Impact from './Impact';
import Chat from './Chat/Chat';
import Notifications from './Notifications/Notifications';
import AIAnalysis from './AIAnalysis';
import Events from './Events';
import './components.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { isConnected, notifications, unreadCount: socketUnreadCount } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/points')) return 'Pontos de Coleta';
    if (path.includes('/register-collection')) return 'Registrar Coleta';
    if (path.includes('/routes')) return 'Rotas';
    if (path.includes('/optimized-routes')) return 'Rotas Otimizadas';
    if (path.includes('/impact')) return 'Impacto Ambiental';
    if (path.includes('/chat')) return 'Chat em Tempo Real';
    if (path.includes('/notifications')) return 'Notificações';
    if (path.includes('/ai')) return 'Análise IA';
    if (path.includes('/events')) return 'Eventos';
    return 'Dashboard';
  };

  const getPageIcon = () => {
    const path = location.pathname;
    if (path.includes('/points')) return 'fas fa-map-marker-alt';
    if (path.includes('/register-collection')) return 'fas fa-recycle';
    if (path.includes('/routes')) return 'fas fa-route';
    if (path.includes('/optimized-routes')) return 'fas fa-map-marked-alt';
    if (path.includes('/impact')) return 'fas fa-leaf';
    if (path.includes('/chat')) return 'fas fa-comments';
    if (path.includes('/notifications')) return 'fas fa-bell';
    if (path.includes('/ai')) return 'fas fa-robot';
    if (path.includes('/events')) return 'fas fa-calendar-alt';
    return 'fas fa-chart-line';
  };

  const formatDate = () => {
    return currentTime.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const formatTime = () => {
    return currentTime.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="dashboard">
      <Sidebar
        user={user}
        onLogout={handleLogout}
        unreadCount={socketUnreadCount}
        isConnected={isConnected}
      />

      <div className="main-content">
        <div className="main-header">
          <div className="header-title">
            <i className={getPageIcon()}></i>
            <h1>{getPageTitle()}</h1>
          </div>

          <div className="header-actions">
            <NotificationBell
              notifications={notifications}
              unreadCount={socketUnreadCount}
            />

            <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
              <span className="status-dot"></span>
              <span className="status-text">
                {isConnected ? 'Online' : 'Reconectando...'}
              </span>
            </div>

            <div className="datetime">
              <div className="header-date" title="Data">
                <i className="fas fa-calendar-alt"></i>
                <span>{formatDate()}</span>
              </div>
              <div className="header-time" title="Hora">
                <i className="fas fa-clock"></i>
                <span>{formatTime()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-routes">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/points" element={<CollectionPoints />} />
            <Route path="/register-collection" element={<RegisterCollection />} />
            <Route path="/routes" element={<RoutesList />} />
            <Route path="/optimized-routes" element={<OptimizedRoutes />} />
            <Route path="/impact" element={<Impact />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/chat/:room" element={<Chat />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/ai" element={<AIAnalysis />} />
            <Route path="/events" element={<Events />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;