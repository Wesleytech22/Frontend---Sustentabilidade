import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Importações do Leaflet (instalar: npm install leaflet react-leaflet@4.2.1)
let MapContainer, TileLayer, Marker, Popup, Polyline;
let L;

try {
    L = require('leaflet');
    const reactLeaflet = require('react-leaflet');
    MapContainer = reactLeaflet.MapContainer;
    TileLayer = reactLeaflet.TileLayer;
    Marker = reactLeaflet.Marker;
    Popup = reactLeaflet.Popup;
    Polyline = reactLeaflet.Polyline;
    require('leaflet/dist/leaflet.css');

    // Criar ícone personalizado
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
} catch (e) {
    console.warn('Leaflet não instalado');
}

// Função para criar ícone numerado
const createNumberedIcon = (number, color = '#4CAF50') => {
    if (!L) return null;
    return L.divIcon({
        html: `<div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${number}</div>`,
        iconSize: [32, 32],
        className: 'custom-div-icon'
    });
};

const OptimizedRoutes = () => {
    const { api } = useAuth();
    const [routes, setRoutes] = useState([]);
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [points, setPoints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapCenter, setMapCenter] = useState([-23.5505, -46.6333]);

    // Carregar todas as rotas
    const loadRoutes = async () => {
        try {
            setLoading(true);
            const response = await api.get('/routes');
            setRoutes(response.data);

            if (response.data.length > 0) {
                setSelectedRoute(response.data[0]);
                await loadRoutePoints(response.data[0]);
            }
        } catch (error) {
            console.error('Erro ao carregar rotas:', error);
        } finally {
            setLoading(false);
        }
    };

    // Carregar pontos de uma rota específica
    const loadRoutePoints = async (route) => {
        if (!route || !route.points || route.points.length === 0) {
            setPoints([]);
            return;
        }

        try {
            const pointsData = [];
            for (const point of route.points) {
                if (point.pointId) {
                    const pointId = typeof point.pointId === 'object' ? point.pointId._id : point.pointId;
                    const response = await api.get(`/points/${pointId}`);
                    if (response.data && response.data.latitude && response.data.longitude) {
                        pointsData.push({
                            ...response.data,
                            order: point.order,
                            estimatedVolume: point.estimatedVolume
                        });
                    }
                }
            }

            // Ordenar por ordem da rota
            pointsData.sort((a, b) => a.order - b.order);
            setPoints(pointsData);

            // Centralizar mapa no primeiro ponto
            if (pointsData.length > 0) {
                setMapCenter([pointsData[0].latitude, pointsData[0].longitude]);
            }

            setMapLoaded(true);
        } catch (error) {
            console.error('Erro ao carregar pontos da rota:', error);
        }
    };

    // Quando mudar a rota selecionada
    useEffect(() => {
        if (selectedRoute) {
            loadRoutePoints(selectedRoute);
        }
    }, [selectedRoute]);

    useEffect(() => {
        loadRoutes();
    }, []);

    const handleRouteChange = (routeId) => {
        const route = routes.find(r => r._id === routeId);
        setSelectedRoute(route);
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Carregando rotas...</p>
            </div>
        );
    }

    return (
        <div className="optimized-routes-container" style={{ padding: '20px' }}>
            {/* Cabeçalho com Filtro */}
            <div className="routes-header" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                flexWrap: 'wrap',
                gap: '15px'
            }}>
                <h2 style={{ margin: 0 }}>
                    <i className="fas fa-map-marked-alt"></i> Rotas Otimizadas
                </h2>

                {/* Filtro de rotas */}
                <div className="filter-section" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ fontWeight: 'bold', color: '#555' }}>
                        <i className="fas fa-filter"></i> Filtrar Rota:
                    </label>
                    <select
                        value={selectedRoute?._id || ''}
                        onChange={(e) => handleRouteChange(e.target.value)}
                        style={{
                            padding: '10px 15px',
                            borderRadius: '8px',
                            border: '1px solid #ddd',
                            backgroundColor: 'white',
                            minWidth: '250px',
                            cursor: 'pointer'
                        }}
                    >
                        {routes.length === 0 ? (
                            <option value="">Nenhuma rota disponível</option>
                        ) : (
                            routes.map(route => (
                                <option key={route._id} value={route._id}>
                                    {route.name} - {new Date(route.date).toLocaleDateString('pt-BR')}
                                    ({route.points?.length || 0} pontos)
                                </option>
                            ))
                        )}
                    </select>
                </div>
            </div>

            {/* Cards de informações da rota selecionada */}
            {selectedRoute && (
                <div className="route-info-cards" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '15px',
                    marginBottom: '20px'
                }}>
                    <div className="info-card" style={{ background: '#e8f5e9', padding: '15px', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <i className="fas fa-route" style={{ fontSize: '24px', color: '#4CAF50' }}></i>
                            <div>
                                <div style={{ fontSize: '12px', color: '#666' }}>Nome da Rota</div>
                                <div style={{ fontWeight: 'bold' }}>{selectedRoute.name}</div>
                            </div>
                        </div>
                    </div>
                    <div className="info-card" style={{ background: '#e3f2fd', padding: '15px', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <i className="fas fa-map-marker-alt" style={{ fontSize: '24px', color: '#2196F3' }}></i>
                            <div>
                                <div style={{ fontSize: '12px', color: '#666' }}>Pontos de Coleta</div>
                                <div style={{ fontWeight: 'bold' }}>{points.length} pontos</div>
                            </div>
                        </div>
                    </div>
                    <div className="info-card" style={{ background: '#fff3e0', padding: '15px', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <i className="fas fa-road" style={{ fontSize: '24px', color: '#FF9800' }}></i>
                            <div>
                                <div style={{ fontSize: '12px', color: '#666' }}>Distância Total</div>
                                <div style={{ fontWeight: 'bold' }}>{selectedRoute.totalDistance?.toFixed(2) || 0} km</div>
                            </div>
                        </div>
                    </div>
                    <div className="info-card" style={{ background: '#fce4ec', padding: '15px', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <i className="fas fa-weight-hanging" style={{ fontSize: '24px', color: '#E91E63' }}></i>
                            <div>
                                <div style={{ fontSize: '12px', color: '#666' }}>Resíduos Estimados</div>
                                <div style={{ fontWeight: 'bold' }}>{selectedRoute.totalWaste || 0} kg</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Mapa */}
            <div className="map-container" style={{
                height: '500px',
                marginTop: '20px',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid #ddd',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
                {mapLoaded && points.length > 0 && MapContainer ? (
                    <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        />

                        {/* Linha da rota */}
                        {points.length > 1 && (
                            <Polyline
                                positions={points.map(p => [p.latitude, p.longitude])}
                                color="#4CAF50"
                                weight={4}
                                opacity={0.8}
                                dashArray="10, 10"
                            />
                        )}

                        {/* Marcadores numerados para cada ponto */}
                        {points.map((point, idx) => {
                            const customIcon = createNumberedIcon(idx + 1, idx === 0 ? '#4CAF50' : '#2196F3');
                            return (
                                <Marker
                                    key={point._id}
                                    position={[point.latitude, point.longitude]}
                                    icon={customIcon}
                                >
                                    <Popup>
                                        <div style={{ minWidth: '200px' }}>
                                            <strong style={{ fontSize: '14px' }}>📍 {point.name}</strong><br />
                                            <span style={{ fontSize: '12px', color: '#666' }}>Ordem: #{idx + 1}</span><br />
                                            <span style={{ fontSize: '12px' }}>📦 Volume: {point.estimatedVolume || point.currentVolume || 0} kg</span><br />
                                            <span style={{ fontSize: '11px', color: '#999' }}>{point.address}</span>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>
                ) : (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        background: '#f9f9f9',
                        flexDirection: 'column'
                    }}>
                        <i className="fas fa-map-marked-alt" style={{ fontSize: '48px', color: '#ccc', marginBottom: '15px' }}></i>
                        <p style={{ color: '#666' }}>
                            {points.length === 0 ? 'Selecione uma rota para visualizar no mapa' : 'Carregando mapa...'}
                        </p>
                        <p style={{ fontSize: '12px', color: '#999' }}>
                            {routes.length === 0 ? 'Nenhuma rota cadastrada. Crie pontos de coleta com coordenadas!' : ''}
                        </p>
                    </div>
                )}
            </div>

            {/* Lista da rota com pontos ordenados */}
            {selectedRoute && points.length > 0 && (
                <div className="route-details" style={{
                    marginTop: '20px',
                    background: '#f9f9f9',
                    padding: '20px',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i className="fas fa-list-ol"></i> Sequência da Coleta
                    </h3>
                    <div className="route-points-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {points.map((point, idx) => (
                            <div key={point._id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px',
                                padding: '12px',
                                borderBottom: '1px solid #eee',
                                backgroundColor: idx % 2 === 0 ? '#fff' : '#f5f5f5',
                                borderRadius: '8px',
                                marginBottom: '5px'
                            }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    background: idx === 0 ? '#4CAF50' : '#2196F3',
                                    color: 'white',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    fontSize: '16px'
                                }}>
                                    {idx + 1}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <strong>{point.name}</strong>
                                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#666' }}>
                                        <i className="fas fa-map-marker-alt" style={{ marginRight: '5px' }}></i>
                                        {point.address}
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ fontSize: '12px', color: '#666' }}>
                                        <i className="fas fa-weight-hanging"></i> {point.estimatedVolume || point.currentVolume || 0} kg
                                    </span>
                                    <br />
                                    <span style={{ fontSize: '11px', color: '#999', fontFamily: 'monospace' }}>
                                        {point.latitude?.toFixed(4)}, {point.longitude?.toFixed(4)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="route-summary" style={{
                        marginTop: '20px',
                        paddingTop: '15px',
                        borderTop: '2px solid #ddd',
                        display: 'flex',
                        gap: '20px',
                        justifyContent: 'space-around',
                        flexWrap: 'wrap'
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <i className="fas fa-road" style={{ color: '#FF9800' }}></i>
                            <div><strong>Distância total</strong></div>
                            <div>{selectedRoute.totalDistance?.toFixed(2) || 0} km</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <i className="fas fa-gas-pump" style={{ color: '#2196F3' }}></i>
                            <div><strong>Combustível estimado</strong></div>
                            <div>{((selectedRoute.totalDistance || 0) * 0.35).toFixed(2)} L</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <i className="fas fa-leaf" style={{ color: '#4CAF50' }}></i>
                            <div><strong>CO₂ estimado</strong></div>
                            <div>{((selectedRoute.totalWaste || 0) * 0.13).toFixed(2)} kg</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OptimizedRoutes;