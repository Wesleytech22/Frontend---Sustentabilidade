import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const RegisterCollection = () => {
    const { api } = useAuth();
    const [points, setPoints] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        collectionPointId: '',
        wasteVolume: '',
        wasteType: '',
        notes: '',
        routeId: ''
    });

    // Carregar pontos de coleta do usuário
    const loadPoints = async () => {
        try {
            const response = await api.get('/points');
            setPoints(response.data);
        } catch (error) {
            console.error('Erro ao carregar pontos:', error);
            setError('Erro ao carregar pontos de coleta');
        }
    };

    // Carregar rotas em andamento
    const loadRoutes = async () => {
        try {
            const response = await api.get('/routes');
            const activeRoutes = response.data.filter(r => r.status === 'IN_PROGRESS' || r.status === 'PLANNED');
            setRoutes(activeRoutes);
        } catch (error) {
            console.error('Erro ao carregar rotas:', error);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([loadPoints(), loadRoutes()]);
            setLoading(false);
        };
        loadData();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            if (!formData.collectionPointId || !formData.wasteVolume || !formData.wasteType) {
                throw new Error('Preencha todos os campos obrigatórios');
            }

            if (formData.wasteVolume <= 0) {
                throw new Error('O volume deve ser maior que zero');
            }

            // Verificar capacidade do ponto
            const selectedPoint = points.find(p => p._id === formData.collectionPointId);
            if (selectedPoint) {
                const currentVolume = selectedPoint.currentVolume || 0;
                const newVolume = currentVolume + parseFloat(formData.wasteVolume);
                if (newVolume > selectedPoint.capacity) {
                    throw new Error(`Capacidade excedida! Disponível: ${selectedPoint.capacity - currentVolume} kg`);
                }
            }

            const collectionData = {
                collectionPointId: formData.collectionPointId,
                wasteVolume: parseFloat(formData.wasteVolume),
                wasteType: formData.wasteType,
                notes: formData.notes || '',
                routeId: formData.routeId || null
            };

            await api.post('/collections', collectionData);

            const wasteLabel = {
                plastico: 'Plástico', papel: 'Papel', vidro: 'Vidro',
                metal: 'Metal', organico: 'Orgânico', eletronico: 'Eletrônico', outros: 'Outros'
            }[formData.wasteType] || formData.wasteType;

            setSuccess(`✅ Coleta registrada! ${formData.wasteVolume} kg de ${wasteLabel}`);

            // Limpar formulário
            setFormData({
                collectionPointId: '',
                wasteVolume: '',
                wasteType: '',
                notes: '',
                routeId: ''
            });

            // Recarregar dados
            await loadPoints();
            await loadRoutes();

            setTimeout(() => setSuccess(''), 4000);

        } catch (error) {
            console.error('Erro ao registrar coleta:', error);
            setError(error.response?.data?.error || error.message || 'Erro ao registrar coleta');
            setTimeout(() => setError(''), 4000);
        } finally {
            setSaving(false);
        }
    };

    const getWasteTypeLabel = (type) => {
        const types = {
            'plastico': 'Plástico',
            'papel': 'Papel',
            'vidro': 'Vidro',
            'metal': 'Metal',
            'organico': 'Orgânico',
            'eletronico': 'Eletrônico',
            'outros': 'Outros'
        };
        return types[type] || type;
    };

    const getWasteIcon = (type) => {
        const icons = {
            'plastico': '🥤',
            'papel': '📄',
            'vidro': '🥃',
            'metal': '🔩',
            'organico': '🍎',
            'eletronico': '💻',
            'outros': '📦'
        };
        return icons[type] || '♻️';
    };

    const getSelectedPoint = () => {
        return points.find(p => p._id === formData.collectionPointId);
    };

    const selectedPoint = getSelectedPoint();
    const availableCapacity = selectedPoint
        ? (selectedPoint.capacity - (selectedPoint.currentVolume || 0))
        : 0;

    if (loading) {
        return (
            <div className="loading-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                <div className="spinner"></div>
                <p style={{ marginLeft: '10px' }}>Carregando...</p>
            </div>
        );
    }

    return (
        <div className="register-collection-container" style={{ padding: '20px', maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ marginBottom: '25px' }}>
                <h2 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fas fa-recycle" style={{ color: '#4CAF50' }}></i>
                    Registrar Coleta
                </h2>
                <p style={{ color: '#666', margin: 0 }}>Registre os resíduos coletados em cada ponto de coleta</p>
            </div>

            {error && (
                <div style={{ background: '#ffebee', color: '#c62828', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fas fa-exclamation-circle"></i>
                    <span>{error}</span>
                </div>
            )}

            {success && (
                <div style={{ background: '#e8f5e9', color: '#2e7d32', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fas fa-check-circle"></i>
                    <span>{success}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        <i className="fas fa-map-marker-alt" style={{ color: '#4CAF50', marginRight: '8px' }}></i>
                        Ponto de Coleta *
                    </label>
                    <select
                        name="collectionPointId"
                        value={formData.collectionPointId}
                        onChange={handleInputChange}
                        required
                        disabled={saving}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
                    >
                        <option value="">Selecione um ponto de coleta</option>
                        {points.map(point => {
                            const used = point.currentVolume || 0;
                            const available = point.capacity - used;
                            const percent = (used / point.capacity) * 100;
                            return (
                                <option key={point._id} value={point._id}>
                                    {point.name} - {point.city} | {available.toLocaleString()} kg disponível de {point.capacity.toLocaleString()} kg
                                </option>
                            );
                        })}
                    </select>
                </div>

                {selectedPoint && (
                    <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                            <span>Capacidade utilizada:</span>
                            <span><strong>{selectedPoint.currentVolume || 0} / {selectedPoint.capacity} kg</strong> ({Math.round((selectedPoint.currentVolume || 0) / selectedPoint.capacity * 100)}%)</span>
                        </div>
                        <div style={{ height: '8px', background: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                                width: `${((selectedPoint.currentVolume || 0) / selectedPoint.capacity) * 100}%`,
                                height: '100%',
                                background: availableCapacity < 100 ? '#f44336' : '#4CAF50',
                                transition: 'width 0.3s'
                            }}></div>
                        </div>
                        <div style={{ marginTop: '10px', fontSize: '13px', color: availableCapacity < 100 ? '#f44336' : '#4CAF50' }}>
                            <i className="fas fa-info-circle"></i> Disponível: {availableCapacity.toLocaleString()} kg
                        </div>
                    </div>
                )}

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        <i className="fas fa-weight-hanging" style={{ color: '#FF9800', marginRight: '8px' }}></i>
                        Volume Coletado (kg) *
                    </label>
                    <input
                        type="number"
                        name="wasteVolume"
                        value={formData.wasteVolume}
                        onChange={handleInputChange}
                        required
                        min="0.1"
                        step="0.1"
                        placeholder="Ex: 150.5"
                        disabled={saving}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
                    />
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        <i className="fas fa-trash-alt" style={{ color: '#2196F3', marginRight: '8px' }}></i>
                        Tipo de Resíduo *
                    </label>
                    <select
                        name="wasteType"
                        value={formData.wasteType}
                        onChange={handleInputChange}
                        required
                        disabled={saving}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
                    >
                        <option value="">Selecione o tipo</option>
                        <option value="plastico">🥤 Plástico</option>
                        <option value="papel">📄 Papel</option>
                        <option value="vidro">🥃 Vidro</option>
                        <option value="metal">🔩 Metal</option>
                        <option value="organico">🍎 Orgânico</option>
                        <option value="eletronico">💻 Eletrônico</option>
                        <option value="outros">📦 Outros</option>
                    </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                        <i className="fas fa-pen" style={{ color: '#9C27B0', marginRight: '8px' }}></i>
                        Observações
                    </label>
                    <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        placeholder="Ex: Coleta realizada no período da manhã, material bem separado..."
                        rows="3"
                        disabled={saving}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px', resize: 'vertical' }}
                    />
                </div>

                {routes.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                            <i className="fas fa-route" style={{ color: '#795548', marginRight: '8px' }}></i>
                            Rota Associada (opcional)
                        </label>
                        <select
                            name="routeId"
                            value={formData.routeId}
                            onChange={handleInputChange}
                            disabled={saving}
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '14px' }}
                        >
                            <option value="">Sem rota associada</option>
                            {routes.map(route => (
                                <option key={route._id} value={route._id}>
                                    {route.name} - {new Date(route.date).toLocaleDateString('pt-BR')}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div style={{ marginTop: '25px', padding: '15px', background: '#e3f2fd', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
                        <i className="fas fa-chart-line"></i> Impacto ambiental desta coleta
                    </h4>
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '13px' }}>
                        <div>
                            <span style={{ color: '#666' }}>🌿 CO₂ evitado:</span>
                            <strong style={{ color: '#4CAF50', marginLeft: '5px' }}>{((formData.wasteVolume || 0) * 0.13).toFixed(2)} kg</strong>
                        </div>
                        <div>
                            <span style={{ color: '#666' }}>💧 Água economizada:</span>
                            <strong style={{ color: '#2196F3', marginLeft: '5px' }}>{((formData.wasteVolume || 0) * 5).toFixed(0)} L</strong>
                        </div>
                        <div>
                            <span style={{ color: '#666' }}>⚡ Energia economizada:</span>
                            <strong style={{ color: '#FF9800', marginLeft: '5px' }}>{((formData.wasteVolume || 0) * 0.35).toFixed(2)} kWh</strong>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    style={{
                        width: '100%',
                        padding: '14px',
                        marginTop: '20px',
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'background 0.3s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = '#45a049'}
                    onMouseLeave={(e) => e.target.style.background = '#4CAF50'}
                >
                    {saving ? (
                        <><i className="fas fa-spinner fa-spin"></i> Registrando coleta...</>
                    ) : (
                        <><i className="fas fa-save"></i> Registrar Coleta</>
                    )}
                </button>
            </form>

            {points.length === 0 && (
                <div style={{ marginTop: '20px', textAlign: 'center', padding: '30px', background: '#fff3e0', borderRadius: '8px' }}>
                    <i className="fas fa-map-marker-alt" style={{ fontSize: '48px', color: '#FF9800' }}></i>
                    <h3>Nenhum ponto de coleta cadastrado</h3>
                    <p>Cadastre um ponto de coleta primeiro para registrar coletas.</p>
                    <a href="/dashboard/points" style={{ color: '#4CAF50' }}>Ir para Pontos de Coleta →</a>
                </div>
            )}
        </div>
    );
};

export default RegisterCollection;