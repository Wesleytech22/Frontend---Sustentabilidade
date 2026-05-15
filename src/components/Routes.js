import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './components.css';

const RoutesList = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const API_URL = 'http://localhost:3000/api';

  const getAuthToken = () => {
    const token = localStorage.getItem('token') ||
      localStorage.getItem('authToken') ||
      sessionStorage.getItem('token') ||
      sessionStorage.getItem('authToken');
    return token;
  };

  const getAuthHeaders = () => {
    const token = getAuthToken();
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
  };

  // Buscar rotas do backend
  const fetchRoutes = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getAuthToken();
      if (!token) {
        setError('Usuário não autenticado. Por favor, faça login.');
        setLoading(false);
        return;
      }

      const response = await axios.get(`${API_URL}/routes`, getAuthHeaders());

      // Adicionar status baseado no horário
      const routesWithStatus = response.data.map(route => ({
        ...route,
        calculatedStatus: calculateRouteStatus(route)
      }));

      setRoutes(routesWithStatus);
    } catch (err) {
      console.error('Erro ao buscar rotas:', err);
      if (err.response?.status === 401) {
        setError('Sessão expirada. Por favor, faça login novamente.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setError('Erro ao carregar rotas: ' + (err.response?.data?.error || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  // Calcular status baseado na data/hora da coleta
  const calculateRouteStatus = (route) => {
    const now = new Date();
    const routeDate = new Date(route.date);
    const routeTime = new Date(routeDate);

    // Definir horário da coleta (padrão 8:00 se não especificado)
    routeTime.setHours(8, 0, 0, 0);

    const timeDiff = routeTime - now;
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    // Status baseado no tempo
    if (route.status === 'COMPLETED') {
      return { text: 'Concluído', color: '#4CAF50', icon: 'fas fa-check-circle' };
    }

    if (route.status === 'CANCELLED') {
      return { text: 'Cancelado', color: '#f44336', icon: 'fas fa-ban' };
    }

    if (hoursDiff <= 0 && hoursDiff > -24) {
      return { text: 'Em Andamento', color: '#2196F3', icon: 'fas fa-spinner fa-pulse' };
    }

    if (hoursDiff < -24) {
      return { text: 'Atrasado', color: '#ff9800', icon: 'fas fa-exclamation-triangle' };
    }

    if (hoursDiff <= 24) {
      return { text: 'Hoje', color: '#9C27B0', icon: 'fas fa-calendar-day' };
    }

    if (hoursDiff <= 48) {
      return { text: 'Amanhã', color: '#00BCD4', icon: 'fas fa-calendar-alt' };
    }

    return { text: 'Agendado', color: '#757575', icon: 'fas fa-calendar-week' };
  };

  // Atualizar status da rota manualmente
  const updateRouteStatus = async (routeId, newStatus) => {
    try {
      await axios.put(`${API_URL}/routes/${routeId}`,
        { status: newStatus },
        getAuthHeaders()
      );
      fetchRoutes();
      alert(`Status da rota atualizado para ${getStatusText(newStatus)}`);
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      alert('Erro ao atualizar status da rota');
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'PLANNED': return 'Planejada';
      case 'IN_PROGRESS': return 'Em Andamento';
      case 'COMPLETED': return 'Concluída';
      case 'CANCELLED': return 'Cancelada';
      default: return status;
    }
  };

  const handleViewDetails = (route) => {
    setSelectedRoute(route);
    setShowDetailsModal(true);
  };

  // Calcular tempo estimado da rota (1 hora por ponto)
  const calculateEstimatedTime = (points) => {
    const hours = points || 1;
    return `${hours} hora${hours > 1 ? 's' : ''}`;
  };

  // Verificar se a rota está no horário de coleta
  const isCollectionTime = (route) => {
    const now = new Date();
    const routeDate = new Date(route.date);
    const routeDateTime = new Date(routeDate);
    routeDateTime.setHours(8, 0, 0, 0);

    const timeDiff = routeDateTime - now;
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    return hoursDiff <= 0 && route.status !== 'COMPLETED' && route.status !== 'CANCELLED';
  };

  useEffect(() => {
    fetchRoutes();
    // Atualizar a cada minuto para verificar status
    const interval = setInterval(fetchRoutes, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading && routes.length === 0) {
    return (
      <div className="routes-container">
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Carregando rotas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="routes-container">
      <div className="routes-header">
        <h2><i className="fas fa-route"></i> Rotas de Coleta</h2>
        <div className="header-stats">
          <span className="stat-badge">
            <i className="fas fa-chart-line"></i> Total: {routes.length}
          </span>
          <span className="stat-badge planned">
            <i className="fas fa-calendar"></i> Pendentes: {routes.filter(r => r.status === 'PLANNED' && r.calculatedStatus?.text !== 'Hoje' && r.calculatedStatus?.text !== 'Amanhã').length}
          </span>
          <span className="stat-badge today">
            <i className="fas fa-sun"></i> Hoje: {routes.filter(r => r.calculatedStatus?.text === 'Hoje' || r.calculatedStatus?.text === 'Amanhã').length}
          </span>
          <span className="stat-badge progress">
            <i className="fas fa-play"></i> Em Andamento: {routes.filter(r => r.calculatedStatus?.text === 'Em Andamento' || r.status === 'IN_PROGRESS').length}
          </span>
          <span className="stat-badge completed">
            <i className="fas fa-check"></i> Concluídas: {routes.filter(r => r.status === 'COMPLETED').length}
          </span>
        </div>
      </div>

      {error && (
        <div className="error-state" style={{ marginBottom: '20px' }}>
          <i className="fas fa-exclamation-triangle"></i>
          <p>{error}</p>
          <button onClick={fetchRoutes} className="btn-primary">Tentar Novamente</button>
        </div>
      )}

      {routes.length === 0 && !error ? (
        <div className="empty-state">
          <div className="empty-icon">
            <i className="fas fa-route"></i>
          </div>
          <h3>Nenhuma rota cadastrada</h3>
          <p>As rotas serão criadas automaticamente ao cadastrar pontos de coleta</p>
          <p style={{ marginTop: '10px', color: '#4CAF50' }}>
            <i className="fas fa-map-marker-alt"></i> Cadastre pontos de coleta para gerar rotas automaticamente
          </p>
        </div>
      ) : (
        <div className="routes-grid">
          {routes.map(route => {
            const statusInfo = route.calculatedStatus;
            const isCollectionDay = statusInfo?.text === 'Hoje' || statusInfo?.text === 'Amanhã';
            const isInProgress = statusInfo?.text === 'Em Andamento' || route.status === 'IN_PROGRESS';

            return (
              <div key={route._id} className={`route-card ${route.status.toLowerCase()}`}>
                <div className="route-header">
                  <div className="route-title">
                    <i className="fas fa-truck"></i>
                    <h3>{route.name}</h3>
                  </div>
                  <div className="status-badge-group">
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor: statusInfo?.color + '20',
                        color: statusInfo?.color,
                        border: `1px solid ${statusInfo?.color}`
                      }}
                    >
                      <i className={statusInfo?.icon}></i>
                      {statusInfo?.text}
                    </span>
                    {route.status === 'PLANNED' && !isCollectionDay && (
                      <span className="status-badge pending">
                        <i className="fas fa-clock"></i> Pendente
                      </span>
                    )}
                    {isCollectionDay && route.status === 'PLANNED' && (
                      <button
                        className="btn-start"
                        onClick={() => updateRouteStatus(route._id, 'IN_PROGRESS')}
                      >
                        <i className="fas fa-play"></i> Iniciar Coleta
                      </button>
                    )}
                    {isInProgress && (
                      <button
                        className="btn-complete"
                        onClick={() => updateRouteStatus(route._id, 'COMPLETED')}
                      >
                        <i className="fas fa-check"></i> Concluir Coleta
                      </button>
                    )}
                  </div>
                </div>

                <div className="route-info">
                  <div className="info-item">
                    <i className="fas fa-calendar-alt"></i>
                    <span>Data: {new Date(route.date).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="info-item">
                    <i className="fas fa-clock"></i>
                    <span>Horário: 08:00</span>
                  </div>
                  <div className="info-item">
                    <i className="fas fa-hourglass-half"></i>
                    <span>Tempo estimado: {calculateEstimatedTime(route.points?.length)}</span>
                  </div>
                  <div className="info-item">
                    <i className="fas fa-map-marker-alt"></i>
                    <span>{route.points?.length || 0} ponto(s) de coleta</span>
                  </div>
                  <div className="info-item">
                    <i className="fas fa-weight-hanging"></i>
                    <span>{route.totalWaste || 0} kg estimados</span>
                  </div>
                </div>

                <div className="route-progress">
                  <div className="progress-label">
                    <span>Progresso da Coleta</span>
                    <span>{route.status === 'COMPLETED' ? '100%' : route.status === 'IN_PROGRESS' ? '50%' : '0%'}</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: route.status === 'COMPLETED' ? '100%' : route.status === 'IN_PROGRESS' ? '50%' : '0%',
                        backgroundColor: route.status === 'COMPLETED' ? '#4CAF50' : route.status === 'IN_PROGRESS' ? '#2196F3' : '#ff9800'
                      }}
                    ></div>
                  </div>
                </div>

                <div className="route-footer">
                  <button
                    className="btn-view"
                    onClick={() => handleViewDetails(route)}
                  >
                    <i className="fas fa-eye"></i> Ver Detalhes
                  </button>
                  <button
                    className="btn-edit"
                    onClick={() => updateRouteStatus(route._id, 'CANCELLED')}
                    disabled={route.status === 'COMPLETED'}
                  >
                    <i className="fas fa-times"></i> Cancelar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE DETALHES */}
      {showDetailsModal && selectedRoute && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detalhes da Rota</h2>
              <button className="close" onClick={() => setShowDetailsModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="details-section">
                <h3>Informações Gerais</h3>
                <p><strong>Nome:</strong> {selectedRoute.name}</p>
                <p><strong>Data da Coleta:</strong> {new Date(selectedRoute.date).toLocaleDateString('pt-BR')} às 08:00</p>
                <p><strong>Status:</strong> {getStatusText(selectedRoute.status)}</p>
                <p><strong>Tempo estimado:</strong> {calculateEstimatedTime(selectedRoute.points?.length)}</p>
                {selectedRoute.description && <p><strong>Descrição:</strong> {selectedRoute.description}</p>}
              </div>

              <div className="details-section">
                <h3><i className="fas fa-map-marker-alt"></i> Pontos de Coleta ({selectedRoute.points?.length || 0})</h3>
                {selectedRoute.points?.map((point, idx) => (
                  <div key={idx} className="point-item">
                    <div className="point-order">{idx + 1}</div>
                    <div className="point-info">
                      <strong>{point.pointId?.name || 'Ponto de coleta'}</strong>
                      <p>{point.pointId?.address || 'Endereço não informado'}</p>
                      <small>Volume estimado: {point.estimatedVolume || 0} kg</small>
                    </div>
                    <div className="point-status">
                      {point.collectedAt ? (
                        <span className="collected"><i className="fas fa-check"></i> Coletado</span>
                      ) : (
                        <span className="pending-collection"><i className="fas fa-clock"></i> Pendente</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="details-section">
                <h3>Métricas da Coleta</h3>
                <p><strong>Distância Total:</strong> {selectedRoute.totalDistance || 0} km</p>
                <p><strong>Volume Coletado:</strong> {selectedRoute.totalWaste || 0} kg</p>
                <p><strong>CO₂ Economizado:</strong> {Math.round((selectedRoute.totalWaste || 0) * 0.13)} kg</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowDetailsModal(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .routes-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
          flex-wrap: wrap;
          gap: 15px;
        }
        .header-stats {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .stat-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 13px;
          background: #f5f5f5;
          color: #666;
        }
        .stat-badge.planned { background: #fff3e0; color: #ff9800; }
        .stat-badge.today { background: #e3f2fd; color: #2196F3; }
        .stat-badge.progress { background: #e8f5e9; color: #4CAF50; }
        .stat-badge.completed { background: #e8f5e9; color: #2e7d32; }
        .routes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 20px;
        }
        .route-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: transform 0.2s;
        }
        .route-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .route-card.completed {
          border-left: 4px solid #4CAF50;
          background: #f9fff9;
        }
        .route-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 15px;
          flex-wrap: wrap;
          gap: 10px;
        }
        .route-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .route-title i {
          font-size: 20px;
          color: #4CAF50;
        }
        .route-title h3 {
          margin: 0;
          font-size: 16px;
        }
        .status-badge-group {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .btn-start, .btn-complete {
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
        }
        .btn-start {
          background: #2196F3;
          color: white;
        }
        .btn-complete {
          background: #4CAF50;
          color: white;
        }
        .route-info {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-bottom: 15px;
        }
        .info-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #666;
        }
        .info-item i {
          width: 18px;
          color: #4CAF50;
        }
        .route-progress {
          margin-bottom: 15px;
        }
        .progress-label {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          margin-bottom: 5px;
          color: #666;
        }
        .progress-bar {
          height: 6px;
          background: #eee;
          border-radius: 3px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s;
        }
        .route-footer {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }
        .point-item {
          display: flex;
          gap: 12px;
          padding: 10px;
          border-bottom: 1px solid #eee;
        }
        .point-order {
          width: 28px;
          height: 28px;
          background: #4CAF50;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
        }
        .point-info {
          flex: 1;
        }
        .point-info p {
          margin: 2px 0;
          font-size: 12px;
          color: #666;
        }
        .collected { color: #4CAF50; font-size: 12px; }
        .pending-collection { color: #ff9800; font-size: 12px; }
      `}</style>
    </div>
  );
};

export default RoutesList;