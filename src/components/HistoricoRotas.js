import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './HistoricoRotas.css';

const HistoricoRotas = () => {
    const { api } = useAuth();
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [routeDetails, setRouteDetails] = useState(null);

    // Paginação
    const [currentPage, setCurrentPage] = useState(1);
    const [routesPerPage] = useState(10);

    // Filtros
    const [filterStatus, setFilterStatus] = useState('all');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [searchTerm, setSearchTerm] = useState('');

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

    const fetchHistoryRoutes = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = getAuthToken();
            if (!token) {
                setError('Usuário não autenticado');
                setLoading(false);
                return;
            }

            const response = await axios.get(`${API_URL}/routes`, getAuthHeaders());

            // Filtrar apenas COMPLETED e CANCELLED
            let historyRoutes = response.data.filter(route =>
                route.status === 'COMPLETED' || route.status === 'CANCELLED'
            );

            // Aplicar filtro de status
            if (filterStatus === 'completed') {
                historyRoutes = historyRoutes.filter(r => r.status === 'COMPLETED');
            } else if (filterStatus === 'cancelled') {
                historyRoutes = historyRoutes.filter(r => r.status === 'CANCELLED');
            }

            // Aplicar filtro de data
            if (dateRange.start) {
                const startDate = new Date(dateRange.start);
                startDate.setHours(0, 0, 0, 0);
                historyRoutes = historyRoutes.filter(r => new Date(r.date) >= startDate);
            }
            if (dateRange.end) {
                const endDate = new Date(dateRange.end);
                endDate.setHours(23, 59, 59);
                historyRoutes = historyRoutes.filter(r => new Date(r.date) <= endDate);
            }

            // Aplicar filtro de busca
            if (searchTerm) {
                historyRoutes = historyRoutes.filter(r =>
                    r.name.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }

            // Ordenar por data (mais recentes primeiro)
            historyRoutes.sort((a, b) => {
                const dateA = new Date(a.completedAt || a.updatedAt || a.date);
                const dateB = new Date(b.completedAt || b.updatedAt || b.date);
                return dateB - dateA;
            });

            setRoutes(historyRoutes);
            setCurrentPage(1);
        } catch (err) {
            console.error('Erro ao buscar histórico:', err);
            setError('Erro ao carregar histórico: ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    const fetchRouteDetails = async (routeId) => {
        try {
            const response = await axios.get(`${API_URL}/routes/${routeId}`, getAuthHeaders());
            setRouteDetails(response.data);
        } catch (error) {
            console.error('Erro ao buscar detalhes da rota:', error);
        }
    };

    const handleViewDetails = async (route) => {
        setSelectedRoute(route);
        await fetchRouteDetails(route._id);
        setShowDetailsModal(true);
    };

    const getStatusBadge = (status) => {
        if (status === 'COMPLETED') {
            return { text: 'Concluída', color: '#4CAF50', icon: 'fas fa-check-circle', bg: '#e8f5e9' };
        }
        return { text: 'Cancelada', color: '#f44336', icon: 'fas fa-ban', bg: '#ffebee' };
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const formatDateTime = (date) => {
        return new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const calculateEstimatedTime = (points) => {
        const hours = points || 1;
        return `${hours} hora${hours > 1 ? 's' : ''}`;
    };

    // Paginação
    const indexOfLastRoute = currentPage * routesPerPage;
    const indexOfFirstRoute = indexOfLastRoute - routesPerPage;
    const currentRoutes = routes.slice(indexOfFirstRoute, indexOfLastRoute);
    const totalPages = Math.ceil(routes.length / routesPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);
    const nextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
    const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

    useEffect(() => {
        fetchHistoryRoutes();
    }, [filterStatus, dateRange.start, dateRange.end, searchTerm]);

    if (loading && routes.length === 0) {
        return (
            <div className="historico-container">
                <div className="loading-state">
                    <i className="fas fa-spinner fa-spin"></i>
                    <p>Carregando histórico...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="historico-container">
            <div className="historico-header">
                <h1>
                    <i className="fas fa-history"></i>
                    Histórico de Coletas
                </h1>
                <p className="subtitle">Rotas concluídas e canceladas</p>
            </div>

            {/* Filtros */}
            <div className="filtros-container">
                <div className="filtro-group">
                    <label><i className="fas fa-filter"></i> Status:</label>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="all">Todos</option>
                        <option value="completed">Concluídas</option>
                        <option value="cancelled">Canceladas</option>
                    </select>
                </div>

                <div className="filtro-group">
                    <label><i className="fas fa-calendar"></i> Data inicial:</label>
                    <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                    />
                </div>

                <div className="filtro-group">
                    <label><i className="fas fa-calendar"></i> Data final:</label>
                    <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                    />
                </div>

                <div className="filtro-group search-group">
                    <label><i className="fas fa-search"></i> Buscar:</label>
                    <input
                        type="text"
                        placeholder="Nome da rota..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Estatísticas */}
            <div className="historico-stats">
                <div className="stat-card">
                    <i className="fas fa-check-circle"></i>
                    <div>
                        <span className="stat-number">{routes.filter(r => r.status === 'COMPLETED').length}</span>
                        <span className="stat-label">Rotas Concluídas</span>
                    </div>
                </div>
                <div className="stat-card">
                    <i className="fas fa-ban"></i>
                    <div>
                        <span className="stat-number">{routes.filter(r => r.status === 'CANCELLED').length}</span>
                        <span className="stat-label">Rotas Canceladas</span>
                    </div>
                </div>
                <div className="stat-card">
                    <i className="fas fa-weight-hanging"></i>
                    <div>
                        <span className="stat-number">{routes.reduce((sum, r) => sum + (r.totalWaste || 0), 0).toLocaleString()} kg</span>
                        <span className="stat-label">Total Coletado</span>
                    </div>
                </div>
                <div className="stat-card">
                    <i className="fas fa-leaf"></i>
                    <div>
                        <span className="stat-number">{Math.round(routes.reduce((sum, r) => sum + (r.totalWaste || 0), 0) * 0.13).toLocaleString()} kg</span>
                        <span className="stat-label">CO₂ Economizado</span>
                    </div>
                </div>
            </div>

            {error && (
                <div className="error-state">
                    <i className="fas fa-exclamation-triangle"></i>
                    <p>{error}</p>
                    <button onClick={fetchHistoryRoutes} className="btn-primary">Tentar Novamente</button>
                </div>
            )}

            {routes.length === 0 && !error ? (
                <div className="empty-state">
                    <div className="empty-icon">
                        <i className="fas fa-history"></i>
                    </div>
                    <h3>Nenhuma rota no histórico</h3>
                    <p>As rotas concluídas ou canceladas aparecerão aqui</p>
                </div>
            ) : (
                <>
                    <div className="historico-table-container">
                        <table className="historico-table">
                            <thead>
                                <tr>
                                    <th>Nome da Rota</th>
                                    <th>Data da Coleta</th>
                                    <th>Data Conclusão</th>
                                    <th>Pontos</th>
                                    <th>Total (kg)</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentRoutes.map(route => {
                                    const statusBadge = getStatusBadge(route.status);
                                    return (
                                        <tr key={route._id}>
                                            <td className="route-name">
                                                <i className="fas fa-route"></i>
                                                {route.name}
                                            </td>
                                            <td>{formatDate(route.date)}</td>
                                            <td>{formatDateTime(route.completedAt || route.updatedAt)}</td>
                                            <td>{route.points?.length || 0}</td>
                                            <td>{route.totalWaste || 0} kg</td>
                                            <td>
                                                <span className="status-badge" style={{ background: statusBadge.bg, color: statusBadge.color }}>
                                                    <i className={statusBadge.icon}></i>
                                                    {statusBadge.text}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    className="btn-details"
                                                    onClick={() => handleViewDetails(route)}
                                                    title="Ver detalhes"
                                                >
                                                    <i className="fas fa-eye"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginação */}
                    {totalPages > 1 && (
                        <div className="pagination-container">
                            <button onClick={prevPage} disabled={currentPage === 1} className="pagination-btn">
                                <i className="fas fa-chevron-left"></i> Anterior
                            </button>

                            <div className="pagination-numbers">
                                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(number => (
                                    <button
                                        key={number}
                                        onClick={() => paginate(number)}
                                        className={`pagination-number ${currentPage === number ? 'active' : ''}`}
                                    >
                                        {number}
                                    </button>
                                ))}
                                {totalPages > 5 && <span className="pagination-dots">...</span>}
                                {totalPages > 5 && (
                                    <button
                                        onClick={() => paginate(totalPages)}
                                        className={`pagination-number ${currentPage === totalPages ? 'active' : ''}`}
                                    >
                                        {totalPages}
                                    </button>
                                )}
                            </div>

                            <button onClick={nextPage} disabled={currentPage === totalPages} className="pagination-btn">
                                Próximo <i className="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    )}

                    <div className="pagination-info">
                        Mostrando {routes.length > 0 ? indexOfFirstRoute + 1 : 0} a {Math.min(indexOfLastRoute, routes.length)} de {routes.length} rotas
                    </div>
                </>
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
                                <p><strong>Data da Coleta:</strong> {formatDate(selectedRoute.date)}</p>
                                <p><strong>Data de Conclusão:</strong> {formatDateTime(selectedRoute.completedAt || selectedRoute.updatedAt)}</p>
                                <p><strong>Status:</strong> {selectedRoute.status === 'COMPLETED' ? 'Concluída' : 'Cancelada'}</p>
                                <p><strong>Tempo estimado:</strong> {calculateEstimatedTime(selectedRoute.points?.length)}</p>
                            </div>

                            <div className="details-section">
                                <h3>Pontos de Coleta ({selectedRoute.points?.length || 0})</h3>
                                {selectedRoute.points?.map((point, idx) => (
                                    <div key={idx} className="point-item">
                                        <div className="point-order">{idx + 1}</div>
                                        <div className="point-info">
                                            <strong>{point.pointId?.name || 'Ponto de coleta'}</strong>
                                            <p>{point.pointId?.address || 'Endereço não informado'}</p>
                                            <small>Volume: {point.estimatedVolume || point.actualVolume || 0} kg</small>
                                        </div>
                                    </div>
                                ))}
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
        </div>
    );
};

export default HistoricoRotas;