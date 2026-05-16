import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './components.css';

const RoutesList = () => {
  const { api } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [routeDetails, setRouteDetails] = useState(null);

  // Estados para vinculação de rotas
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [availablePoints, setAvailablePoints] = useState([]);
  const [selectedPointIds, setSelectedPointIds] = useState([]);
  const [newRouteName, setNewRouteName] = useState('');
  const [linking, setLinking] = useState(false);

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

      const routesWithStatus = response.data.map(route => {
        const statusInfo = calculateRouteStatus(route);
        return {
          ...route,
          calculatedStatus: statusInfo,
          canStart: statusInfo?.text === 'Hoje' || statusInfo?.text === 'Amanhã' || statusInfo?.text === 'Agendado',
          canComplete: statusInfo?.text === 'Em Andamento' || route.status === 'IN_PROGRESS'
        };
      });

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

  // Buscar detalhes de uma rota específica
  const fetchRouteDetails = async (routeId) => {
    try {
      const response = await axios.get(`${API_URL}/routes/${routeId}`, getAuthHeaders());
      setRouteDetails(response.data);
    } catch (error) {
      console.error('Erro ao buscar detalhes da rota:', error);
    }
  };

  // Carregar pontos disponíveis para vinculação
  const loadAvailablePoints = async () => {
    try {
      const token = getAuthToken();
      const response = await axios.get(`${API_URL}/points`, getAuthHeaders());
      const pointsWithCoords = response.data.filter(p => p.latitude && p.longitude);
      setAvailablePoints(pointsWithCoords);
    } catch (error) {
      console.error('Erro ao carregar pontos:', error);
    }
  };

  // Vincular pontos selecionados
  const handleLinkPoints = async () => {
    if (selectedPointIds.length < 2) {
      alert('Selecione pelo menos 2 pontos de coleta');
      return;
    }

    setLinking(true);
    try {
      const response = await axios.post(`${API_URL}/routes/link-points`, {
        pointIds: selectedPointIds,
        routeName: newRouteName || undefined
      }, getAuthHeaders());

      alert(response.data.message);
      setShowLinkModal(false);
      setSelectedPointIds([]);
      setNewRouteName('');
      fetchRoutes();
    } catch (error) {
      console.error('Erro ao vincular:', error);
      alert(error.response?.data?.error || 'Erro ao vincular pontos');
    } finally {
      setLinking(false);
    }
  };

  // Toggle seleção de ponto
  const togglePointSelection = (pointId) => {
    setSelectedPointIds(prev =>
      prev.includes(pointId)
        ? prev.filter(id => id !== pointId)
        : [...prev, pointId]
    );
  };

  // Calcular status baseado na data/hora da coleta
  const calculateRouteStatus = (route) => {
    const now = new Date();
    const routeDate = new Date(route.date);
    const routeTime = new Date(routeDate);
    routeTime.setHours(8, 0, 0, 0);
    const timeDiff = routeTime - now;
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (route.status === 'COMPLETED') {
      return { text: 'Concluído', color: '#4CAF50', icon: 'fas fa-check-circle' };
    }
    if (route.status === 'CANCELLED') {
      return { text: 'Cancelado', color: '#f44336', icon: 'fas fa-ban' };
    }
    if (route.status === 'IN_PROGRESS') {
      return { text: 'Em Andamento', color: '#2196F3', icon: 'fas fa-spinner fa-pulse' };
    }
    if (hoursDiff <= 0 && hoursDiff > -24) {
      return { text: 'Em Andamento', color: '#2196F3', icon: 'fas fa-spinner fa-pulse' };
    }
    if (hoursDiff < -24) {
      return { text: 'Atrasado', color: '#ff9800', icon: 'fas fa-exclamation-triangle' };
    }
    if (hoursDiff <= 24 && hoursDiff > 0) {
      return { text: 'Hoje', color: '#9C27B0', icon: 'fas fa-calendar-day' };
    }
    if (hoursDiff <= 48 && hoursDiff > 24) {
      return { text: 'Amanhã', color: '#00BCD4', icon: 'fas fa-calendar-alt' };
    }
    return { text: 'Agendado', color: '#757575', icon: 'fas fa-calendar-week' };
  };

  // Atualizar status da rota manualmente
  const updateRouteStatus = async (routeId, newStatus) => {
    try {
      setLoading(true);
      await axios.put(`${API_URL}/routes/${routeId}`,
        { status: newStatus },
        getAuthHeaders()
      );
      await fetchRoutes();
      alert(`Status da rota atualizado para ${getStatusText(newStatus)}`);
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      alert('Erro ao atualizar status da rota');
    } finally {
      setLoading(false);
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

  const handleViewDetails = async (route) => {
    setSelectedRoute(route);
    await fetchRouteDetails(route._id);
    setShowDetailsModal(true);
  };

  const calculateEstimatedTime = (points) => {
    const hours = points || 1;
    return `${hours} hora${hours > 1 ? 's' : ''}`;
  };

  // Verificar se um ponto foi coletado
  const isPointCollected = (point) => {
    if (point.collectedAt) return true;
    if (selectedRoute?.status === 'COMPLETED') return true;
    if (point.actualVolume && point.actualVolume > 0) return true;
    return false;
  };

  useEffect(() => {
    fetchRoutes();
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
            <i className="fas fa-calendar"></i> Pendentes: {routes.filter(r => r.status === 'PLANNED' && r.calculatedStatus?.text !== 'Hoje' && r.calculatedStatus?.text !== 'Amanhã' && r.calculatedStatus?.text !== 'Em Andamento').length}
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

      {/* Botão Vincular Rotas */}
      <div className="header-actions" style={{ marginBottom: '20px' }}>
        <button
          className="btn-link"
          onClick={() => {
            loadAvailablePoints();
            setShowLinkModal(true);
          }}
        >
          <i className="fas fa-link"></i> Vincular Rotas
        </button>
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
            const isPlanned = route.status === 'PLANNED';
            const isInProgress = statusInfo?.text === 'Em Andamento' || route.status === 'IN_PROGRESS';
            const isCompleted = route.status === 'COMPLETED';
            const isCancelled = route.status === 'CANCELLED';

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
                    <span>{isCompleted ? '100%' : isInProgress ? '50%' : '0%'}</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: isCompleted ? '100%' : isInProgress ? '50%' : '0%',
                        backgroundColor: isCompleted ? '#4CAF50' : isInProgress ? '#2196F3' : '#ff9800'
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

                  {!isCompleted && !isCancelled && isPlanned && isCollectionDay && (
                    <button
                      className="btn-start"
                      onClick={() => updateRouteStatus(route._id, 'IN_PROGRESS')}
                    >
                      <i className="fas fa-play"></i> Iniciar Coleta
                    </button>
                  )}

                  {!isCompleted && !isCancelled && isInProgress && (
                    <button
                      className="btn-complete"
                      onClick={() => updateRouteStatus(route._id, 'COMPLETED')}
                    >
                      <i className="fas fa-check"></i> Concluir Coleta
                    </button>
                  )}

                  {!isCompleted && !isCancelled && (
                    <button
                      className="btn-cancel"
                      onClick={() => updateRouteStatus(route._id, 'CANCELLED')}
                    >
                      <i className="fas fa-times"></i> Cancelar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE VINCULAÇÃO */}
      {showLinkModal && (
        <div className="modal-overlay" onClick={() => setShowLinkModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2><i className="fas fa-link"></i> Vincular Pontos de Coleta</h2>
              <button className="close" onClick={() => setShowLinkModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nome da Rota (opcional)</label>
                <input
                  type="text"
                  value={newRouteName}
                  onChange={(e) => setNewRouteName(e.target.value)}
                  placeholder="Ex: Rota Zona Sul"
                />
              </div>

              <div className="form-group">
                <label>Selecione os pontos para vincular (mínimo 2)</label>
                <div className="points-selection-list" style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '8px' }}>
                  {availablePoints.map(point => (
                    <label key={point._id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px',
                      margin: '5px 0',
                      background: selectedPointIds.includes(point._id) ? '#e8f5e9' : '#f5f5f5',
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={selectedPointIds.includes(point._id)}
                        onChange={() => togglePointSelection(point._id)}
                      />
                      <div style={{ flex: 1 }}>
                        <strong>{point.name}</strong>
                        <br />
                        <small>{point.address}, {point.city} - {point.state}</small>
                        {point.currentVolume > 0 && (
                          <span style={{ marginLeft: '8px', color: '#4CAF50' }}>
                            📦 {point.currentVolume} kg
                          </span>
                        )}
                      </div>
                      {point.latitude && point.longitude && (
                        <i className="fas fa-map-marker-alt" style={{ color: '#4CAF50' }}></i>
                      )}
                    </label>
                  ))}
                </div>
                {availablePoints.length === 0 && (
                  <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                    Nenhum ponto de coleta com coordenadas cadastrado.
                  </p>
                )}
              </div>

              <div className="selected-info" style={{ marginTop: '15px', padding: '10px', background: '#f5f5f5', borderRadius: '8px', textAlign: 'center' }}>
                <strong>{selectedPointIds.length} ponto(s) selecionado(s)</strong>
                {selectedPointIds.length >= 2 && (
                  <span style={{ color: '#4CAF50', marginLeft: '10px' }}>
                    <i className="fas fa-check"></i> Pode criar rota
                  </span>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowLinkModal(false)}>Cancelar</button>
              <button
                className="btn-primary"
                onClick={handleLinkPoints}
                disabled={selectedPointIds.length < 2 || linking}
              >
                {linking ? (
                  <><i className="fas fa-spinner fa-spin"></i> Vinculando...</>
                ) : (
                  <><i className="fas fa-link"></i> Vincular Rotas</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES COM STATUS DOS PONTOS */}
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
                {selectedRoute.points?.map((point, idx) => {
                  const pointsData = routeDetails?.points?.find(p => p._id === point._id) || point;
                  const isCollected = pointsData?.collectedAt ||
                    selectedRoute.status === 'COMPLETED' ||
                    pointsData?.actualVolume > 0;

                  return (
                    <div key={idx} className="point-item" style={{
                      background: isCollected ? '#e8f5e9' : 'transparent',
                      borderLeft: isCollected ? '3px solid #4CAF50' : 'none'
                    }}>
                      <div className="point-order">{idx + 1}</div>
                      <div className="point-info">
                        <strong>{point.pointId?.name || pointsData?.pointName || 'Ponto de coleta'}</strong>
                        <p>{point.pointId?.address || pointsData?.pointAddress || 'Endereço não informado'}</p>
                        <small>Volume estimado: {point.estimatedVolume || 0} kg</small>
                        {pointsData?.actualVolume > 0 && (
                          <small style={{ display: 'block', color: '#4CAF50' }}>
                            Volume coletado: {pointsData.actualVolume} kg
                          </small>
                        )}
                      </div>
                      <div className="point-status">
                        {isCollected ? (
                          <span className="collected">
                            <i className="fas fa-check-circle"></i> Coletado
                            {pointsData?.collectedAt && (
                              <small style={{ display: 'block', fontSize: '10px' }}>
                                {new Date(pointsData.collectedAt).toLocaleDateString('pt-BR')}
                              </small>
                            )}
                          </span>
                        ) : (
                          <span className="pending-collection">
                            <i className="fas fa-clock"></i> Pendente
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="details-section">
                <h3>Métricas da Coleta</h3>
                <p><strong>Distância Total:</strong> {selectedRoute.totalDistance || 0} km</p>
                <p><strong>Volume Coletado:</strong> {selectedRoute.totalWaste || 0} kg</p>
                <p><strong>CO₂ Economizado:</strong> {Math.round((selectedRoute.totalWaste || 0) * 0.13)} kg</p>
                <p><strong>Combustível Economizado:</strong> {Math.round((selectedRoute.totalDistance || 0) * 0.35)} L</p>
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
        .header-actions {
          margin-bottom: 20px;
        }
        .btn-link {
          background: #9C27B0;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s;
        }
        .btn-link:hover {
          background: #7B1FA2;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(156, 39, 176, 0.3);
        }
        .btn-start, .btn-complete, .btn-cancel {
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.3s;
        }
        .btn-start {
          background: #2196F3;
          color: white;
        }
        .btn-start:hover {
          background: #1976D2;
          transform: translateY(-2px);
        }
        .btn-complete {
          background: #4CAF50;
          color: white;
        }
        .btn-complete:hover {
          background: #388E3C;
          transform: translateY(-2px);
        }
        .btn-cancel {
          background: #f44336;
          color: white;
        }
        .btn-cancel:hover {
          background: #d32f2f;
          transform: translateY(-2px);
        }
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
          border-radius: 8px;
          margin-bottom: 5px;
          transition: all 0.3s;
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
        .collected { 
          color: #4CAF50; 
          font-size: 12px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }
        .pending-collection { 
          color: #ff9800; 
          font-size: 12px;
        }
        .points-selection-list {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 8px;
          background: white;
        }
        .selected-info {
          margin-top: 15px;
          padding: 10px;
          background: #f5f5f5;
          border-radius: 8px;
          text-align: center;
        }
      `}</style>
    </div>
  );
};

export default RoutesList;