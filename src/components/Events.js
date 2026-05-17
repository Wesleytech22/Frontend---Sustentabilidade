import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './components.css';

const EventsList = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [externalEvents, setExternalEvents] = useState([]);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [eventsPerPage] = useState(6);

  const [searchParams, setSearchParams] = useState({
    keyword: '',
    city: '',
    countryCode: 'BR',
    classification: ''
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'outro',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    latitude: '',
    longitude: '',
    startDate: '',
    endDate: '',
    expectedAttendees: '',
    estimatedWaste: ''
  });

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

  // Buscar eventos e também buscar as rotas para saber o status atualizado
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      if (!token) {
        setError('Usuário não autenticado');
        setLoading(false);
        return;
      }

      const [eventsResponse, routesResponse] = await Promise.all([
        axios.get(`${API_URL}/events`, getAuthHeaders()),
        axios.get(`${API_URL}/routes`, getAuthHeaders())
      ]);

      const eventsData = eventsResponse.data || [];
      const routesData = routesResponse.data || [];

      const routeMap = new Map();
      routesData.forEach(route => {
        if (route.eventInfo && route.eventInfo.eventId) {
          routeMap.set(route.eventInfo.eventId, route);
        }
      });

      const eventsWithUpdatedStatus = eventsData.map(event => {
        const associatedRoute = routeMap.get(event._id);

        if (associatedRoute) {
          let eventStatus = event.status;

          switch (associatedRoute.status) {
            case 'IN_PROGRESS':
              eventStatus = 'em_andamento';
              break;
            case 'COMPLETED':
              eventStatus = 'finalizado';
              break;
            case 'CANCELLED':
              eventStatus = 'cancelado';
              break;
            case 'PLANNED':
              if (event.status !== 'finalizado' && event.status !== 'cancelado') {
                eventStatus = 'coleta_agendada';
              }
              break;
            default:
              eventStatus = event.status;
          }

          return {
            ...event,
            status: eventStatus,
            routeStatus: associatedRoute.status,
            routeDate: associatedRoute.date,
            routeId: associatedRoute._id
          };
        }

        return event;
      });

      setEvents(eventsWithUpdatedStatus);
      setCurrentPage(1);
    } catch (err) {
      console.error('Erro ao buscar eventos:', err);
      setError('Erro ao carregar eventos');
    } finally {
      setLoading(false);
    }
  };

  const fetchAddressByCep = async (cep) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      alert('CEP inválido. Digite 8 dígitos.');
      return false;
    }

    try {
      const token = getAuthToken();
      const response = await axios.get(`${API_URL}/geocode/zipcode/${cleanCep}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        setFormData(prev => ({
          ...prev,
          address: response.data.data.address || prev.address,
          city: response.data.data.city || prev.city,
          state: response.data.data.state || prev.state,
          latitude: response.data.data.latitude || '',
          longitude: response.data.data.longitude || '',
          zipCode: cleanCep
        }));
        alert('✅ Endereço preenchido automaticamente via CEP!');
        return true;
      } else {
        alert('⚠️ CEP não encontrado. Preencha o endereço manualmente.');
        return false;
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      alert('❌ Erro ao buscar CEP. Preencha o endereço manualmente.');
      return false;
    }
  };

  const getCurrentEvents = () => {
    const indexOfLastEvent = currentPage * eventsPerPage;
    const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
    return events.slice(indexOfFirstEvent, indexOfLastEvent);
  };

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => {
    if (currentPage < Math.ceil(events.length / eventsPerPage)) {
      setCurrentPage(currentPage + 1);
    }
  };
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const currentEvents = getCurrentEvents();
  const totalPages = Math.ceil(events.length / eventsPerPage);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      const eventData = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        startDate: formData.startDate,
        endDate: formData.endDate,
        expectedAttendees: parseInt(formData.expectedAttendees) || 0,
        estimatedWaste: parseFloat(formData.estimatedWaste) || (parseInt(formData.expectedAttendees) * 0.5) || 0
      };

      await axios.post(`${API_URL}/events`, eventData, getAuthHeaders());
      alert('Evento criado com sucesso!');
      setShowCreateModal(false);
      setFormData({
        name: '', description: '', type: 'outro', address: '', city: '',
        state: '', zipCode: '', latitude: '', longitude: '', startDate: '',
        endDate: '', expectedAttendees: '', estimatedWaste: ''
      });
      fetchEvents();
    } catch (err) {
      console.error('Erro ao criar evento:', err);
      alert(err.response?.data?.error || 'Erro ao criar evento');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishEvent = async (eventId) => {
    if (!window.confirm('Finalizar este evento? Uma rota de coleta será criada.')) return;

    try {
      await axios.post(`${API_URL}/events/${eventId}/finish`, {}, getAuthHeaders());
      alert('Evento finalizado! Coleta agendada.');
      fetchEvents();
    } catch (err) {
      console.error('Erro ao finalizar evento:', err);
      alert(err.response?.data?.error || 'Erro ao finalizar evento');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Tem certeza que deseja excluir este evento?')) return;

    try {
      await axios.delete(`${API_URL}/events/${eventId}`, getAuthHeaders());
      alert('Evento excluído com sucesso!');
      fetchEvents();
    } catch (err) {
      console.error('Erro ao excluir evento:', err);
      alert('Erro ao excluir evento');
    }
  };

  const searchExternalEvents = async () => {
    try {
      setSearching(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchParams.keyword) params.append('keyword', searchParams.keyword);
      if (searchParams.city) params.append('city', searchParams.city);
      if (searchParams.countryCode) params.append('countryCode', searchParams.countryCode);
      if (searchParams.classification) params.append('classification', searchParams.classification);

      const response = await axios.get(`${API_URL}/events/external/search?${params.toString()}`, getAuthHeaders());

      if (response.data.success) {
        setExternalEvents(response.data.events || []);
        if (response.data.events.length === 0) {
          alert('Nenhum evento encontrado. Tente outros termos de busca.');
        }
      } else {
        setError(response.data.error || 'Erro ao buscar eventos');
      }
    } catch (err) {
      console.error('Erro ao buscar eventos externos:', err);
      setError(err.response?.data?.error || 'Erro ao conectar com a API de eventos');
    } finally {
      setSearching(false);
    }
  };

  const importExternalEvent = async (eventId) => {
    try {
      setImporting(true);
      const response = await axios.post(`${API_URL}/events/external/import/${eventId}`, {}, getAuthHeaders());

      if (response.data.success) {
        alert(`Evento "${response.data.event.name}" importado com sucesso!`);
        setShowExternalModal(false);
        setExternalEvents([]);
        setSearchParams({ keyword: '', city: '', countryCode: 'BR', classification: '' });
        fetchEvents();
      } else {
        alert(response.data.error || 'Erro ao importar evento');
      }
    } catch (err) {
      console.error('Erro ao importar evento:', err);
      alert(err.response?.data?.error || 'Erro ao importar evento');
    } finally {
      setImporting(false);
    }
  };

  const searchByClassification = async (classification) => {
    setSearchParams({ ...searchParams, classification });
    try {
      setSearching(true);
      const response = await axios.get(`${API_URL}/events/external/classification/${encodeURIComponent(classification)}?countryCode=BR`, getAuthHeaders());

      if (response.data.success) {
        setExternalEvents(response.data.events || []);
        if (response.data.events.length === 0) {
          alert(`Nenhum evento encontrado para a classificação: ${classification}`);
        }
      } else {
        setError(response.data.error || 'Erro ao buscar eventos');
      }
    } catch (err) {
      console.error('Erro ao buscar por classificação:', err);
      setError(err.response?.data?.error || 'Erro ao buscar eventos por classificação');
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(() => {
      fetchEvents();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusText = (status) => {
    switch (status) {
      case 'agendado': return 'Agendado';
      case 'planejado': return 'Planejado';
      case 'em_andamento': return 'Em Andamento';
      case 'finalizado': return 'Finalizado';
      case 'coleta_agendada': return 'Coleta Agendada';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'agendado': return '#2196F3';
      case 'planejado': return '#4CAF50';
      case 'em_andamento': return '#ff9800';
      case 'finalizado': return '#9C27B0';
      case 'coleta_agendada': return '#4CAF50';
      case 'cancelado': return '#f44336';
      default: return '#999';
    }
  };

  const formatCollectionDate = (event) => {
    if (event.routeDate) {
      const routeDate = new Date(event.routeDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (routeDate.toDateString() === today.toDateString()) {
        return `Coleta HOJE (${routeDate.toLocaleDateString('pt-BR')})`;
      } else if (routeDate.toDateString() === tomorrow.toDateString()) {
        return `Coleta AMANHÃ (${routeDate.toLocaleDateString('pt-BR')})`;
      } else {
        return `Coleta agendada para ${routeDate.toLocaleDateString('pt-BR')}`;
      }
    }
    return 'Aguardando agendamento';
  };

  if (loading && events.length === 0) {
    return (
      <div className="events-container">
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Carregando eventos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="events-container">
      <div className="events-header">
        <h2><i className="fas fa-calendar-alt"></i> Eventos</h2>
        <div className="header-buttons">
          <button className="btn-primary" onClick={() => setShowExternalModal(true)}>
            <i className="fas fa-globe"></i> Buscar Eventos Externos
          </button>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            <i className="fas fa-plus"></i> Criar Evento
          </button>
        </div>
      </div>

      {error && (
        <div className="error-state">
          <i className="fas fa-exclamation-triangle"></i>
          <p>{error}</p>
          <button onClick={fetchEvents} className="btn-primary">Tentar Novamente</button>
        </div>
      )}

      {events.length === 0 && !error ? (
        <div className="empty-state">
          <div className="empty-icon">
            <i className="fas fa-calendar-alt"></i>
          </div>
          <h3>Nenhum evento cadastrado</h3>
          <p>Clique em "Buscar Eventos Externos" para importar eventos ou "Criar Evento" para cadastrar manualmente</p>
        </div>
      ) : (
        <>
          <div className="events-grid">
            {currentEvents.map(event => (
              <div key={event._id} className="event-card">
                <div className="event-header">
                  <div className="event-icon">
                    <i className="fas fa-calendar-alt"></i>
                  </div>
                  <h3>{event.name}</h3>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(event.status) + '20', color: getStatusColor(event.status) }}
                  >
                    {getStatusText(event.status)}
                  </span>
                </div>

                <p className="event-description">{event.description || 'Sem descrição'}</p>

                <div className="event-details">
                  <div className="detail">
                    <i className="fas fa-map-marker-alt"></i>
                    <span>{event.city}, {event.state}</span>
                  </div>
                  <div className="detail">
                    <i className="fas fa-calendar"></i>
                    <span>Evento: {new Date(event.startDate).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="detail">
                    <i className="fas fa-users"></i>
                    <span>{event.expectedAttendees?.toLocaleString()} pessoas</span>
                  </div>
                  <div className="detail">
                    <i className="fas fa-trash-alt"></i>
                    <span>{event.estimatedWaste} kg estimados</span>
                  </div>

                  {(event.status === 'coleta_agendada' || event.status === 'em_andamento') && (
                    <div className="detail highlight">
                      <i className="fas fa-truck"></i>
                      <span>{formatCollectionDate(event)}</span>
                    </div>
                  )}

                  {event.status === 'finalizado' && (
                    <div className="detail highlight">
                      <i className="fas fa-check-circle"></i>
                      <span>Coleta realizada com sucesso!</span>
                    </div>
                  )}

                  {event.status === 'cancelado' && (
                    <div className="detail highlight" style={{ color: '#f44336' }}>
                      <i className="fas fa-ban"></i>
                      <span>Coleta cancelada</span>
                    </div>
                  )}
                </div>

                <div className="event-actions">
                  {(event.status === 'agendado' || event.status === 'planejado') && (
                    <button className="btn-finish" onClick={() => handleFinishEvent(event._id)}>
                      <i className="fas fa-check"></i> Finalizar Evento
                    </button>
                  )}

                  {event.status === 'coleta_agendada' && event.routeStatus !== 'IN_PROGRESS' && (
                    <span className="info-text">
                      <i className="fas fa-clock"></i> Aguardando início da coleta
                    </span>
                  )}

                  {event.status === 'em_andamento' && (
                    <span className="info-text">
                      <i className="fas fa-spinner fa-spin"></i> Coleta em andamento...
                    </span>
                  )}

                  {event.status !== 'finalizado' && event.status !== 'cancelado' && (
                    <button className="btn-delete" onClick={() => handleDeleteEvent(event._id)}>
                      <i className="fas fa-trash"></i> Excluir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination-container">
              <button onClick={prevPage} disabled={currentPage === 1} className="pagination-btn">
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
              <button onClick={nextPage} disabled={currentPage === totalPages} className="pagination-btn">
                Próximo <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          )}

          <div className="pagination-info">
            Mostrando {events.length > 0 ? ((currentPage - 1) * eventsPerPage) + 1 : 0} a {Math.min(currentPage * eventsPerPage, events.length)} de {events.length} eventos
          </div>
        </>
      )}

      {/* MODAL DE BUSCA EXTERNA */}
      {showExternalModal && (
        <div className="modal-overlay" onClick={() => setShowExternalModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h2><i className="fas fa-globe"></i> Buscar Eventos Externos</h2>
              <button className="close" onClick={() => setShowExternalModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="details-section">
                <h3>Busca Rápida</h3>
                <div className="quick-search-buttons" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button className="btn-secondary" onClick={() => searchByClassification('music')}>
                    <i className="fas fa-music"></i> Shows
                  </button>
                  <button className="btn-secondary" onClick={() => searchByClassification('sports')}>
                    <i className="fas fa-futbol"></i> Esportes
                  </button>
                  <button className="btn-secondary" onClick={() => searchByClassification('conference')}>
                    <i className="fas fa-chalkboard-user"></i> Conferências
                  </button>
                  <button className="btn-secondary" onClick={() => searchByClassification('festival')}>
                    <i className="fas fa-tree"></i> Festivais
                  </button>
                </div>
              </div>

              <div className="details-section">
                <h3>Busca Personalizada</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Palavra-chave</label>
                    <input
                      type="text"
                      value={searchParams.keyword}
                      onChange={(e) => setSearchParams({ ...searchParams, keyword: e.target.value })}
                      placeholder="Ex: Rock in Rio, Show, Teatro"
                      onKeyPress={(e) => e.key === 'Enter' && searchExternalEvents()}
                    />
                  </div>
                  <div className="form-group">
                    <label>Cidade</label>
                    <input
                      type="text"
                      value={searchParams.city}
                      onChange={(e) => setSearchParams({ ...searchParams, city: e.target.value })}
                      placeholder="Ex: São Paulo, Rio de Janeiro"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Classificação</label>
                    <select
                      value={searchParams.classification}
                      onChange={(e) => setSearchParams({ ...searchParams, classification: e.target.value })}
                    >
                      <option value="">Todas</option>
                      <option value="music">Música/Shows</option>
                      <option value="sports">Esportes</option>
                      <option value="arts">Artes e Teatro</option>
                      <option value="conference">Conferências</option>
                      <option value="festival">Festivais</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>País</label>
                    <select
                      value={searchParams.countryCode}
                      onChange={(e) => setSearchParams({ ...searchParams, countryCode: e.target.value })}
                    >
                      <option value="BR">Brasil</option>
                      <option value="US">Estados Unidos</option>
                      <option value="PT">Portugal</option>
                      <option value="ES">Espanha</option>
                      <option value="FR">França</option>
                      <option value="UK">Reino Unido</option>
                    </select>
                  </div>
                </div>
                <button
                  className="btn-primary"
                  onClick={searchExternalEvents}
                  disabled={searching}
                  style={{ width: '100%', marginTop: '10px' }}
                >
                  {searching ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}
                  {' '}{searching ? 'Buscando...' : 'Buscar Eventos'}
                </button>
              </div>

              {externalEvents.length > 0 && (
                <div className="details-section">
                  <h3>Resultados ({externalEvents.length} eventos)</h3>
                  <div className="external-events-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {externalEvents.map((event, index) => (
                      <div key={event.id || index} className="external-event-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <div style={{ flex: 1 }}>
                            <h4>{event.name}</h4>
                            <p><i className="fas fa-map-marker-alt"></i> {event.city}, {event.state}</p>
                            <p><i className="fas fa-calendar"></i> {new Date(event.startDate).toLocaleDateString('pt-BR')}</p>
                            <div>
                              <span className="status-badge">{event.classification || 'Evento'}</span>
                              <span className="status-badge"><i className="fas fa-users"></i> {event.expectedAttendees?.toLocaleString()} pessoas</span>
                            </div>
                          </div>
                          <button
                            className="btn-primary"
                            onClick={() => importExternalEvent(event.id)}
                            disabled={importing}
                          >
                            <i className="fas fa-download"></i> Importar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowExternalModal(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CRIAR EVENTO MANUAL */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Criar Evento</h2>
              <button className="close" onClick={() => setShowCreateModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreateEvent}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nome do Evento *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Descrição</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label>CEP *</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                      required
                      placeholder="Ex: 06711500"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => fetchAddressByCep(formData.zipCode)}
                    >
                      <i className="fas fa-search"></i> Buscar
                    </button>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Endereço *</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Cidade *</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Estado *</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                      placeholder="SP"
                      maxLength="2"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Data Início *</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Data Fim *</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Público Esperado *</label>
                    <input
                      type="number"
                      value={formData.expectedAttendees}
                      onChange={(e) => {
                        const attendees = parseInt(e.target.value) || 0;
                        setFormData({
                          ...formData,
                          expectedAttendees: e.target.value,
                          estimatedWaste: (attendees * 0.5).toString()
                        });
                      }}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Resíduos Estimados (kg)</label>
                    <input
                      type="number"
                      value={formData.estimatedWaste}
                      onChange={(e) => setFormData({ ...formData, estimatedWaste: e.target.value })}
                      placeholder="Automático (0.5kg/pessoa)"
                    />
                  </div>
                </div>

                <input type="hidden" name="latitude" value={formData.latitude} />
                <input type="hidden" name="longitude" value={formData.longitude} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={loading}>Criar Evento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .events-container {
          padding: 20px;
        }
        .events-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
          flex-wrap: wrap;
          gap: 15px;
        }
        .header-buttons {
          display: flex;
          gap: 10px;
        }
        .events-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 20px;
        }
        .event-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: transform 0.2s;
        }
        .event-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .event-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 15px;
          flex-wrap: wrap;
        }
        .event-icon i {
          font-size: 24px;
          color: #4CAF50;
        }
        .event-header h3 {
          margin: 0;
          flex: 1;
          font-size: 16px;
        }
        .event-description {
          color: #666;
          font-size: 13px;
          margin-bottom: 15px;
        }
        .event-details {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-bottom: 15px;
        }
        .detail {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #666;
        }
        .detail i {
          width: 16px;
          color: #4CAF50;
        }
        .detail.highlight {
          color: #4CAF50;
          font-weight: 500;
        }
        .event-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          align-items: center;
          flex-wrap: wrap;
        }
        .btn-finish {
          background: #4CAF50;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
        }
        .btn-delete {
          background: #f44336;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
        }
        .info-text {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #666;
          background: #f5f5f5;
          padding: 6px 12px;
          border-radius: 6px;
        }
        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
        }
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
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
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
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid #ddd;
          background: white;
          cursor: pointer;
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
        }
        .external-event-card {
          background: #f8f9fa;
          padding: 15px;
          margin-bottom: 10px;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
        }
        .external-event-card h4 {
          margin: 0 0 8px 0;
          color: #333;
        }
        .external-event-card p {
          margin: 5px 0;
          font-size: 13px;
          color: #666;
        }
      `}</style>
    </div>
  );
};

export default EventsList;