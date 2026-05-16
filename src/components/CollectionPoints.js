import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const CollectionPoints = () => {
  const { api } = useAuth();
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPoint, setEditingPoint] = useState(null);
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchingCep, setSearchingCep] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    number: '',        // 👈 NOVO CAMPO
    address: '',
    city: '',
    state: '',
    zipCode: '',
    wasteTypes: [],
    capacity: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  // Função para buscar endereço por CEP
  const searchAddressByCep = async (cep) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setSearchingCep(true);
    try {
      const token = getAuthToken();
      const response = await axios.get(`${API_URL}/geocode/zipcode/${cleanCep}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        const data = response.data.data;

        let message = 'Endereço encontrado! ';
        if (data.hasCoordinates) {
          message += `Coordenadas: ${data.latitude?.toFixed(4)}, ${data.longitude?.toFixed(4)}`;
        } else {
          message += 'Coordenadas não disponíveis para este CEP.';
        }
        alert(message);

        setFormData(prev => ({
          ...prev,
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zipCode: cleanCep
        }));
      } else {
        alert('CEP não encontrado');
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      alert('Erro ao buscar CEP. Verifique o número digitado.');
    } finally {
      setSearchingCep(false);
    }
  };

  useEffect(() => {
    loadPoints();
  }, []);

  const loadPoints = async () => {
    setLoading(true);
    try {
      const response = await api.get('/points');
      setPoints(response.data);
    } catch (error) {
      console.error('Erro ao carregar pontos:', error);
      setError('Erro ao carregar pontos de coleta');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleWasteTypeChange = (type) => {
    const newTypes = formData.wasteTypes.includes(type)
      ? formData.wasteTypes.filter(t => t !== type)
      : [...formData.wasteTypes, type];

    setFormData({
      ...formData,
      wasteTypes: newTypes
    });
  };

  const handleEdit = (point) => {
    setEditingPoint(point);
    setFormData({
      name: point.name || '',
      number: point.number || '',
      address: point.address || '',
      city: point.city || '',
      state: point.state || '',
      zipCode: point.zipCode || '',
      wasteTypes: point.wasteTypes || [],
      capacity: point.capacity || ''
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (!formData.name || !formData.address || !formData.zipCode || !formData.capacity) {
        throw new Error('Preencha todos os campos obrigatórios');
      }

      if (formData.zipCode.replace(/\D/g, '').length !== 8) {
        throw new Error('CEP inválido. Digite um CEP com 8 dígitos.');
      }

      // Construir endereço completo com número
      const fullAddress = formData.number
        ? `${formData.address}, ${formData.number}`
        : formData.address;

      const pointData = {
        name: formData.name,
        number: formData.number,
        address: fullAddress,
        city: formData.city || '',
        state: formData.state?.toUpperCase() || '',
        zipCode: formData.zipCode || '',
        wasteTypes: formData.wasteTypes,
        capacity: parseFloat(formData.capacity)
      };

      const response = await api.put(`/points/${editingPoint._id}`, pointData);

      setSuccess('Ponto de coleta atualizado com sucesso!');

      setTimeout(() => {
        setShowEditModal(false);
        setEditingPoint(null);
        setFormData({
          name: '',
          number: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          wasteTypes: [],
          capacity: ''
        });
        loadPoints();
      }, 1500);

    } catch (error) {
      console.error('Erro detalhado:', error);
      setError(error.response?.data?.error || error.message || 'Erro ao atualizar ponto de coleta');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      if (!formData.name || !formData.address || !formData.zipCode || !formData.capacity) {
        throw new Error('Preencha todos os campos obrigatórios');
      }

      if (formData.zipCode.replace(/\D/g, '').length !== 8) {
        throw new Error('CEP inválido. Digite um CEP com 8 dígitos.');
      }

      // Construir endereço completo com número
      const fullAddress = formData.number
        ? `${formData.address}, ${formData.number}`
        : formData.address;

      const pointData = {
        name: formData.name,
        number: formData.number,
        address: fullAddress,
        city: formData.city || '',
        state: formData.state?.toUpperCase() || '',
        zipCode: formData.zipCode || '',
        wasteTypes: formData.wasteTypes,
        capacity: parseFloat(formData.capacity)
      };

      const response = await api.post('/points', pointData);

      setSuccess('Ponto de coleta criado com sucesso!');

      setTimeout(() => {
        setShowModal(false);
        setFormData({
          name: '',
          number: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          wasteTypes: [],
          capacity: ''
        });
        loadPoints();
      }, 1500);

    } catch (error) {
      console.error('Erro detalhado:', error);
      setError(error.response?.data?.error || error.message || 'Erro ao criar ponto de coleta');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar este ponto?')) {
      try {
        await api.delete(`/points/${id}`);
        setSuccess('Ponto deletado com sucesso!');
        loadPoints();
      } catch (error) {
        console.error('Erro ao deletar ponto:', error);
        setError('Erro ao deletar ponto');
      }
    }
  };

  const getWasteTypeLabel = (type) => {
    const types = {
      'plastico': 'Plástico',
      'papel': 'Papel',
      'vidro': 'Vidro',
      'metal': 'Metal',
      'organico': 'Orgânico',
      'eletronico': 'Eletrônico'
    };
    return types[type] || type;
  };

  const filteredPoints = points.filter(point => {
    const matchesSearch = filter === '' ||
      point.name?.toLowerCase().includes(filter.toLowerCase()) ||
      point.address?.toLowerCase().includes(filter.toLowerCase()) ||
      point.city?.toLowerCase().includes(filter.toLowerCase());

    const matchesType = typeFilter === '' ||
      (point.wasteTypes && point.wasteTypes.includes(typeFilter));

    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Carregando pontos de coleta...</p>
      </div>
    );
  }

  return (
    <div className="points-container">
      <div className="points-header">
        <h2>Pontos de Coleta</h2>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <i className="fas fa-plus"></i> Novo Ponto
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <i className="fas fa-exclamation-circle"></i>
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <i className="fas fa-check-circle"></i>
          {success}
        </div>
      )}

      <div className="filters-section">
        <div className="search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Buscar por nome, endereço ou cidade..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">Todos os tipos</option>
          <option value="plastico">Plástico</option>
          <option value="papel">Papel</option>
          <option value="vidro">Vidro</option>
          <option value="metal">Metal</option>
          <option value="organico">Orgânico</option>
        </select>
      </div>

      {filteredPoints.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <i className="fas fa-map-marker-alt"></i>
          </div>
          <h3>Nenhum ponto de coleta encontrado</h3>
          <p>{filter || typeFilter ? 'Tente outros filtros' : 'Clique em "Novo Ponto" para começar'}</p>
        </div>
      ) : (
        <div className="points-grid">
          {filteredPoints.map(point => (
            <div key={point._id} className="point-card">
              <div className="point-card-header">
                <h3>{point.name}</h3>
                <div className="card-actions">
                  <button
                    className="btn-edit"
                    onClick={() => handleEdit(point)}
                    title="Editar ponto"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(point._id)}
                    title="Deletar ponto"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>

              <div className="point-address">
                <i className="fas fa-map-marker-alt"></i>
                <span>{point.address}, {point.city} - {point.state}</span>
              </div>

              {point.zipCode && (
                <div className="point-zipcode" style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                  <i className="fas fa-mail-bulk"></i> CEP: {point.zipCode}
                </div>
              )}

              {point.wasteTypes && point.wasteTypes.length > 0 && (
                <div className="point-types">
                  {point.wasteTypes.map(type => (
                    <span key={type} className="type-tag">
                      {getWasteTypeLabel(type)}
                    </span>
                  ))}
                </div>
              )}

              <div className="point-capacity">
                <div className="capacity-info">
                  <i className="fas fa-weight-hanging"></i>
                  <span>Capacidade: {point.currentVolume || 0}/{point.capacity} kg</span>
                </div>
                <div className="capacity-bar">
                  <div
                    className="capacity-fill"
                    style={{ width: `${((point.currentVolume || 0) / point.capacity) * 100}%` }}
                  ></div>
                </div>
              </div>

              {point.latitude && point.longitude && (
                <div className="point-coordinates" style={{ fontSize: '11px', color: '#999', marginTop: '8px' }}>
                  <i className="fas fa-globe"></i> Coordenadas: {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
                </div>
              )}

              <div className="point-footer">
                <span className={`status-badge ${point.status?.toLowerCase() || 'active'}`}>
                  {point.status === 'ACTIVE' ? 'Ativo' : point.status || 'Ativo'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE CRIAÇÃO */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Novo Ponto de Coleta</h2>
              <button className="close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Nome do Ponto *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Ex: Ecoponto Centro"
                    disabled={saving}
                  />
                </div>

                <div className="form-group">
                  <label>CEP *</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData({ ...formData, zipCode: value });
                        if (value.replace(/\D/g, '').length === 8) {
                          searchAddressByCep(value);
                        }
                      }}
                      placeholder="00000-000"
                      maxLength="9"
                      required
                      disabled={saving || searchingCep}
                      style={{ flex: 1 }}
                    />
                    {searchingCep && <i className="fas fa-spinner fa-spin" style={{ padding: '12px' }}></i>}
                  </div>
                  <small style={{ color: '#666', fontSize: '11px' }}>
                    Digite o CEP e o endereço será preenchido automaticamente
                  </small>
                </div>

                <div className="form-group">
                  <label>Logradouro *</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    placeholder="Ex: Rua Augusta"
                    disabled={saving}
                  />
                </div>

                <div className="form-group">
                  <label>Número *</label>
                  <input
                    type="text"
                    name="number"
                    value={formData.number}
                    onChange={handleInputChange}
                    required
                    placeholder="Ex: 500"
                    disabled={saving}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Cidade</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="São Paulo"
                      disabled={saving}
                    />
                  </div>

                  <div className="form-group">
                    <label>UF</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      maxLength="2"
                      placeholder="SP"
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Capacidade (kg) *</label>
                  <input
                    type="number"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleInputChange}
                    required
                    placeholder="5000"
                    min="1"
                    disabled={saving}
                  />
                </div>

                <div className="form-group">
                  <label>Tipos de Resíduos Aceitos</label>
                  <div className="checkbox-group">
                    {['plastico', 'papel', 'vidro', 'metal', 'organico', 'eletronico'].map(type => (
                      <label key={type}>
                        <input
                          type="checkbox"
                          checked={formData.wasteTypes.includes(type)}
                          onChange={() => handleWasteTypeChange(type)}
                          disabled={saving}
                        />
                        {getWasteTypeLabel(type)}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowModal(false)}
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save"></i>
                        Salvar Ponto
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO */}
      {showEditModal && editingPoint && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Editar Ponto de Coleta</h2>
              <button className="close" onClick={() => setShowEditModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }}>
                <div className="form-group">
                  <label>Nome do Ponto *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Ex: Ecoponto Centro"
                    disabled={saving}
                  />
                </div>

                <div className="form-group">
                  <label>CEP *</label>
                  <input
                    type="text"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({ ...formData, zipCode: value });
                      if (value.replace(/\D/g, '').length === 8) {
                        searchAddressByCep(value);
                      }
                    }}
                    placeholder="00000-000"
                    maxLength="9"
                    required
                    disabled={saving || searchingCep}
                  />
                </div>

                <div className="form-group">
                  <label>Logradouro *</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    placeholder="Ex: Rua Augusta"
                    disabled={saving}
                  />
                </div>

                <div className="form-group">
                  <label>Número *</label>
                  <input
                    type="text"
                    name="number"
                    value={formData.number}
                    onChange={handleInputChange}
                    required
                    placeholder="Ex: 500"
                    disabled={saving}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Cidade</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="São Paulo"
                      disabled={saving}
                    />
                  </div>

                  <div className="form-group">
                    <label>UF</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      maxLength="2"
                      placeholder="SP"
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Capacidade (kg) *</label>
                  <input
                    type="number"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleInputChange}
                    required
                    placeholder="5000"
                    min="1"
                    disabled={saving}
                  />
                </div>

                <div className="form-group">
                  <label>Tipos de Resíduos Aceitos</label>
                  <div className="checkbox-group">
                    {['plastico', 'papel', 'vidro', 'metal', 'organico', 'eletronico'].map(type => (
                      <label key={type}>
                        <input
                          type="checkbox"
                          checked={formData.wasteTypes.includes(type)}
                          onChange={() => handleWasteTypeChange(type)}
                          disabled={saving}
                        />
                        {getWasteTypeLabel(type)}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setShowEditModal(false)}
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save"></i>
                        Salvar Alterações
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionPoints;