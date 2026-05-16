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

  // ========== ADICIONADO: Estados para paginação ==========
  const [currentPage, setCurrentPage] = useState(1);
  const [routesPerPage] = useState(6);

  // Estados para vinculação de rotas
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [availableRoutes, setAvailableRoutes] = useState([]);
  const [selectedRouteIds, setSelectedRouteIds] = useState([]);
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

      // ========== ADICIONADO: Filtrar apenas rotas em agendamento (PLANNED) e em andamento (IN_PROGRESS) ==========
      const activeRoutes = response.data.filter(route =>
        route.status === 'PLANNED' || route.status === 'IN_PROGRESS'
      );

      const routesWithStatus = activeRoutes.map(route => {
        const statusInfo = calculateRouteStatus(route);
        return {
          ...route,
          calculatedStatus: statusInfo,
          canStart: statusInfo?.text === 'Hoje' || statusInfo?.text === 'Amanhã' || statusInfo?.text === 'Agendado',
          canComplete: statusInfo?.text === 'Em Andamento' || route.status === 'IN_PROGRESS'
        };
      });

      setRoutes(routesWithStatus);
      // ========== ADICIONADO: Resetar para página 1 ao recarregar ==========
      setCurrentPage(1);
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

  // ========== ADICIONADO: Funções de paginação ==========
  const getCurrentRoutes = () => {
    const indexOfLastRoute = currentPage * routesPerPage;
    const indexOfFirstRoute = indexOfLastRoute - routesPerPage;
    return routes.slice(indexOfFirstRoute, indexOfLastRoute);
  };

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const nextPage = () => {
    if (currentPage < Math.ceil(routes.length / routesPerPage)) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
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

  // Carregar rotas disponíveis para vinculação (apenas rotas PLANEJADAS)
  const loadAvailableRoutes = async () => {
    try {
      const response = await axios.get(`${API_URL}/routes`, getAuthHeaders());

      const plannedRoutes = response.data.filter(route =>
        route.status === 'PLANNED'
      );

      console.log('📋 Rotas planejadas disponíveis:', plannedRoutes.length);
      setAvailableRoutes(plannedRoutes);

      if (plannedRoutes.length === 0) {
        alert('Nenhuma rota planejada disponível para vincular.');
      }
    } catch (error) {
      console.error('Erro ao carregar rotas:', error);
      alert('Erro ao carregar rotas: ' + (error.response?.data?.error || error.message));
    }
  };

  // Vincular rotas selecionadas em uma nova rota combinada
  const handleLinkRoutes = async () => {
    if (selectedRouteIds.length < 2) {
      alert('Selecione pelo menos 2 rotas para vincular');
      return;
    }

    setLinking(true);
    try {
      const routesToCombine = availableRoutes.filter(route =>
        selectedRouteIds.includes(route._id)
      );

      const allPoints = [];
      for (const route of routesToCombine) {
        const routeDetails = await axios.get(`${API_URL}/routes/${route._id}`, getAuthHeaders());
        const points = routeDetails.data.points || [];
        points.forEach(point => {
          if (point.pointId) {
            allPoints.push(point.pointId);
          }
        });
      }

      const uniquePoints = [];
      const pointIds = new Set();
      for (const point of allPoints) {
        if (!pointIds.has(point._id)) {
          pointIds.add(point._id);
          uniquePoints.push(point);
        }
      }

      if (uniquePoints.length < 2) {
        alert('As rotas selecionadas precisam ter no mínimo 2 pontos únicos no total');
        setLinking(false);
        return;
      }

      const response = await axios.post(`${API_URL}/routes/link-points`, {
        pointIds: uniquePoints.map(p => p._id),
        routeName: newRouteName || `Rota Combinada - ${routesToCombine.map(r => r.name).join(' + ')}`
      }, getAuthHeaders());

      alert(response.data.message);

      const deleteOriginal = window.confirm('Deseja deletar as rotas originais após vincular?');
      if (deleteOriginal) {
        for (const route of routesToCombine) {
          await axios.delete(`${API_URL}/routes/${route._id}`, getAuthHeaders());
        }
        alert('Rotas originais removidas!');
      }

      setShowLinkModal(false);
      setSelectedRouteIds([]);
      setNewRouteName('');
      fetchRoutes();

    } catch (error) {
      console.error('Erro ao vincular rotas:', error);
      alert(error.response?.data?.error || 'Erro ao vincular rotas');
    } finally {
      setLinking(false);
    }
  };

  const toggleRouteSelection = (routeId) => {
    setSelectedRouteIds(prev =>
      prev.includes(routeId)
        ? prev.filter(id => id !== routeId)
        : [...prev, routeId]
    );
  };

  const TEST_MODE = true;

  const calculateRouteStatus = (route) => {
    const now = new Date();
    const routeDate = new Date(route.date);

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const routeDay = new Date(routeDate.getFullYear(), routeDate.getMonth(), routeDate.getDate());

    // Status baseado no status do backend primeiro
    if (route.status === 'COMPLETED') {
      return { text: 'Concluído', color: '#4CAF50', icon: 'fas fa-check-circle' };
    }
    if (route.status === 'CANCELLED') {
      return { text: 'Cancelado', color: '#f44336', icon: 'fas fa-ban' };
    }
    if (route.status === 'IN_PROGRESS') {
      return { text: 'Em Andamento', color: '#2196F3', icon: 'fas fa-spinner fa-pulse' };
    }

    // MODO TESTE: força status "Hoje" para aparecer o botão
    if (TEST_MODE) {
      return { text: 'Hoje', color: '#9C27B0', icon: 'fas fa-calendar-day' };
    }

    // ========== LÓGICA REAL (só executa quando TEST_MODE = false) ==========
    const diffDays = Math.ceil((routeDay - today) / (1000 * 60 * 60 * 24));

    // Status baseado na data
    if (diffDays < 0) {
      return { text: 'Atrasado', color: '#ff9800', icon: 'fas fa-exclamation-triangle' };
    }
    if (diffDays === 0) {
      return { text: 'Hoje', color: '#9C27B0', icon: 'fas fa-calendar-day' };
    }
    if (diffDays === 1) {
      return { text: 'Amanhã', color: '#00BCD4', icon: 'fas fa-calendar-alt' };
    }

    return { text: 'Agendado', color: '#757575', icon: 'fas fa-calendar-week' };
  };

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

  // ========== ADICIONADO: Calcular total de páginas e rotas atuais ==========
  const totalPages = Math.ceil(routes.length / routesPerPage);
  const currentRoutes = getCurrentRoutes();

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
          {/* ========== REMOVIDO: badge de Concluídas ========== */}
        </div>
      </div>

      <div className="header-actions" style={{ marginBottom: '20px' }}>
        <button
          className="btn-link"
          onClick={() => {
            loadAvailableRoutes();
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
        <>
          <div className="routes-grid">
            {currentRoutes.map(route => {
              const statusInfo = route.calculatedStatus;
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

                    {(route.status === 'PLANNED' || statusInfo?.text === 'Agendado') && (statusInfo?.text === 'Hoje' || statusInfo?.text === 'Amanhã') && (
                      <button
                        className="btn-start"
                        onClick={() => updateRouteStatus(route._id, 'IN_PROGRESS')}
                      >
                        <i className="fas fa-play"></i> Iniciar Coleta
                      </button>
                    )}

                    {route.status === 'IN_PROGRESS' && (
                      <button
                        className="btn-complete"
                        onClick={() => updateRouteStatus(route._id, 'COMPLETED')}
                      >
                        <i className="fas fa-check"></i> Concluir Coleta
                      </button>
                    )}

                    {route.status !== 'COMPLETED' && route.status !== 'CANCELLED' && (
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

          {/* ========== ADICIONADO: Componente de Paginação ========== */}
          {totalPages > 1 && (
            <div className="pagination-container">
              <button
                onClick={prevPage}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                <i className="fas fa-chevron-left"></i> Anterior
              </button>

              <div className="pagination-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                  <button
                    key={number}
                    onClick={() => paginate(number)}
                    className={`pagination-number ${currentPage === number ? 'active' : ''}`}
                  >
                    {number}
                  </button>
                ))}
              </div>

              <button
                onClick={nextPage}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                Próximo <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          )}

          {/* ========== ADICIONADO: Informação de paginação ========== */}
          <div className="pagination-info">
            Mostrando {routes.length > 0 ? ((currentPage - 1) * routesPerPage) + 1 : 0} a {Math.min(currentPage * routesPerPage, routes.length)} de {routes.length} rotas
          </div>
        </>
      )}

      {/* MODAL DE VINCULAÇÃO DE ROTAS */}
      {showLinkModal && (
        <div className="modal-overlay" onClick={() => setShowLinkModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <div className="modal-title">
                <i className="fas fa-link" style={{ color: '#9C27B0', fontSize: '24px' }}></i>
                <h2>Vincular Rotas de Coleta</h2>
              </div>
              <button className="close" onClick={() => setShowLinkModal(false)}>&times;</button>
            </div>

            <div className="modal-body">
              <div className="form-group route-name-group">
                <label className="form-label">
                  <i className="fas fa-pen"></i> Nome da Nova Rota
                  <span className="optional">(opcional)</span>
                </label>
                <input
                  type="text"
                  className="route-name-input"
                  value={newRouteName}
                  onChange={(e) => setNewRouteName(e.target.value)}
                  placeholder="Ex: Rota Combinada Zona Sul"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <i className="fas fa-list"></i> Selecione as rotas para vincular
                  <span className="required">(mínimo 2)</span>
                </label>

                {availableRoutes.length === 0 ? (
                  <div className="empty-routes">
                    <i className="fas fa-calendar-times"></i>
                    <p>Nenhuma rota planejada disponível</p>
                    <small>Crie novas rotas para poder vinculá-las</small>
                  </div>
                ) : (
                  <div className="routes-list-container">
                    {availableRoutes.map(route => {
                      const pontosCount = route.points?.length || 0;
                      const isSelected = selectedRouteIds.includes(route._id);
                      const totalWaste = route.totalWaste || 0;
                      const routeDate = new Date(route.date);
                      const isToday = routeDate.toDateString() === new Date().toDateString();

                      return (
                        <div
                          key={route._id}
                          className={`route-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleRouteSelection(route._id)}
                        >
                          <div className="route-checkbox">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleRouteSelection(route._id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            {isSelected && <i className="fas fa-check-circle check-icon"></i>}
                          </div>

                          <div className="route-content">
                            <div className="route-name-section">
                              <h4>{route.name}</h4>
                              <span className={`date-badge ${isToday ? 'today' : ''}`}>
                                <i className="fas fa-calendar-alt"></i>
                                {routeDate.toLocaleDateString('pt-BR')}
                              </span>
                            </div>

                            <div className="route-stats">
                              <div className="stat">
                                <i className="fas fa-map-marker-alt"></i>
                                <span>{pontosCount} {pontosCount === 1 ? 'ponto' : 'pontos'}</span>
                              </div>
                              <div className="stat">
                                <i className="fas fa-weight-hanging"></i>
                                <span>{totalWaste.toLocaleString()} kg</span>
                              </div>
                              <div className="stat">
                                <i className="fas fa-clock"></i>
                                <span>{pontosCount} hora{pontosCount > 1 ? 's' : ''}</span>
                              </div>
                            </div>

                            <div className="route-footer-info">
                              <span className="status-agendada">
                                <i className="fas fa-calendar-check"></i> Agendada para {routeDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className={`selection-summary ${selectedRouteIds.length >= 2 ? 'ready' : 'pending'}`}>
                <div className="summary-left">
                  <i className={`fas ${selectedRouteIds.length >= 2 ? 'fa-check-circle' : 'fa-info-circle'}`}></i>
                  <div>
                    <strong>{selectedRouteIds.length} rota(s) selecionada(s)</strong>
                    {selectedRouteIds.length < 2 && (
                      <small>Selecione pelo menos 2 rotas para vincular</small>
                    )}
                    {selectedRouteIds.length >= 2 && (
                      <small className="ready-text">Pronto para vincular as rotas selecionadas</small>
                    )}
                  </div>
                </div>
                {selectedRouteIds.length >= 2 && (
                  <div className="summary-right">
                    <i className="fas fa-arrow-right"></i>
                    <span>Combinar</span>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancelar" onClick={() => setShowLinkModal(false)}>
                <i className="fas fa-times"></i> Cancelar
              </button>
              <button
                className="btn-vincular"
                onClick={handleLinkRoutes}
                disabled={selectedRouteIds.length < 2 || linking}
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
        
        /* ========== ADICIONADO: Estilos da Paginação ========== */
        .pagination-container {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 15px;
          margin-top: 30px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        
        .pagination-btn {
          background: #4CAF50;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s;
        }
        
        .pagination-btn:hover:not(:disabled) {
          background: #388E3C;
          transform: translateY(-2px);
        }
        
        .pagination-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        
        .pagination-numbers {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        
        .pagination-number {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          border: 1px solid #ddd;
          background: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.3s;
        }
        
        .pagination-number:hover {
          background: #f5f5f5;
          border-color: #4CAF50;
        }
        
        .pagination-number.active {
          background: #4CAF50;
          color: white;
          border-color: #4CAF50;
        }
        
        .pagination-info {
          text-align: center;
          font-size: 14px;
          color: #666;
          margin-top: 10px;
          margin-bottom: 20px;
        }
      `}</style>
    </div>
  );
};

export default RoutesList;