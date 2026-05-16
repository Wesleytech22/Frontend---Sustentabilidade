import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Importações do Leaflet
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

    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
} catch (e) {
    console.warn('Leaflet não instalado. Execute: npm install leaflet react-leaflet@4.2.1');
}

// Função para extrair latitude do ponto (suporta os dois formatos)
const getLatitude = (point) => {
    if (point.latitude) return point.latitude;
    if (point.location?.coordinates) return point.location.coordinates[1];
    return null;
};

// Função para extrair longitude do ponto (suporta os dois formatos)
const getLongitude = (point) => {
    if (point.longitude) return point.longitude;
    if (point.location?.coordinates) return point.location.coordinates[0];
    return null;
};

const OptimizedRoutes = () => {
    const { api } = useAuth();
    const [routes, setRoutes] = useState([]);
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [points, setPoints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [mapCenter, setMapCenter] = useState([-23.5505, -46.6333]);

    const loadRoutes = async () => {
        try {
            setLoading(true);
            const response = await api.get('/routes');
            console.log('Rotas carregadas:', response.data);
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

    const loadRoutePoints = async (route) => {
        if (!route || !route.points || route.points.length === 0) {
            console.log('Rota sem pontos');
            setPoints([]);
            return;
        }

        try {
            const pointsData = [];

            for (const point of route.points) {
                const pointId = point.pointId?._id || point.pointId;
                if (pointId) {
                    try {
                        const response = await api.get(`/points/${pointId}`);
                        const pointData = response.data;

                        // Extrair coordenadas do formato que o backend retorna
                        const lat = getLatitude(pointData);
                        const lng = getLongitude(pointData);

                        console.log(`Ponto: ${pointData.name}, lat: ${lat}, lng: ${lng}`);

                        if (lat && lng) {
                            pointsData.push({
                                _id: pointData._id,
                                name: pointData.name,
                                address: pointData.address,
                                zipCode: pointData.zipCode,
                                latitude: lat,
                                longitude: lng,
                                order: point.order,
                                estimatedVolume: point.estimatedVolume,
                                currentVolume: pointData.currentVolume
                            });
                        } else {
                            console.warn(`Ponto sem coordenadas: ${pointData.name}`);
                        }
                    } catch (err) {
                        console.error('Erro ao buscar ponto:', pointId, err);
                    }
                }
            }

            pointsData.sort((a, b) => (a.order || 0) - (b.order || 0));
            console.log('Pontos carregados:', pointsData);
            setPoints(pointsData);

            if (pointsData.length > 0 && pointsData[0].latitude) {
                setMapCenter([pointsData[0].latitude, pointsData[0].longitude]);
            }
            setMapLoaded(true);
        } catch (error) {
            console.error('Erro ao carregar pontos da rota:', error);
        }
    };

    useEffect(() => {
        if (selectedRoute) {
            loadRoutePoints(selectedRoute);
        }
    }, [selectedRoute]);

    useEffect(() => {
        loadRoutes();
    }, []);

    const createNumberedIcon = (number, color = '#4CAF50') => {
        if (!L) return null;
        return L.divIcon({
            html: `<div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${number}</div>`,
            iconSize: [32, 32],
            className: 'custom-div-icon'
        });
    };

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

    // Filtrar apenas pontos com coordenadas válidas
    const validPoints = points.filter(p => p.latitude && p.longitude);

    return (
        <div className="optimized-routes-container" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                <h2><i className="fas fa-map-marked-alt"></i> Rotas Otimizadas</h2>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label><i className="fas fa-filter"></i> Filtrar Rota:</label>
                    <select
                        value={selectedRoute?._id || ''}
                        onChange={(e) => handleRouteChange(e.target.value)}
                        style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid #ddd', minWidth: '250px' }}
                    >
                        {routes.length === 0 ? <option value="">Nenhuma rota disponível</option> :
                            routes.map(route => (
                                <option key={route._id} value={route._id}>
                                    {route.name} - {new Date(route.date).toLocaleDateString('pt-BR')} ({route.points?.length || 0} pontos)
                                </option>
                            ))}
                    </select>
                </div>
            </div>

            {selectedRoute && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                    <div style={{ background: '#e8f5e9', padding: '15px', borderRadius: '8px' }}>
                        <i className="fas fa-route"></i> <strong>Rota:</strong> {selectedRoute.name}
                    </div>
                    <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '8px' }}>
                        <i className="fas fa-map-marker-alt"></i> <strong>Pontos:</strong> {validPoints.length} / {points.length}
                    </div>
                    <div style={{ background: '#fff3e0', padding: '15px', borderRadius: '8px' }}>
                        <i className="fas fa-road"></i> <strong>Distância:</strong> {selectedRoute.totalDistance?.toFixed(2) || 0} km
                    </div>
                    <div style={{ background: '#fce4ec', padding: '15px', borderRadius: '8px' }}>
                        <i className="fas fa-weight-hanging"></i> <strong>Resíduos:</strong> {selectedRoute.totalWaste || 0} kg
                    </div>
                </div>
            )}

            <div style={{ height: '500px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #ddd', marginBottom: '20px' }}>
                {mapLoaded && validPoints.length > 0 && MapContainer ? (
                    <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        {validPoints.length > 1 && (
                            <Polyline positions={validPoints.map(p => [p.latitude, p.longitude])} color="#4CAF50" weight={4} />
                        )}
                        {validPoints.map((point, idx) => (
                            <Marker
                                key={point._id}
                                position={[point.latitude, point.longitude]}
                                icon={createNumberedIcon(idx + 1, idx === 0 ? '#4CAF50' : '#2196F3')}
                            >
                                <Popup>
                                    <strong>{point.name}</strong><br />
                                    {point.address}<br />
                                    Ordem: #{idx + 1}<br />
                                    Volume: {point.estimatedVolume || point.currentVolume || 0} kg
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#f9f9f9', flexDirection: 'column' }}>
                        <i className="fas fa-map-marked-alt" style={{ fontSize: '48px', color: '#ccc', marginBottom: '15px' }}></i>
                        <p style={{ color: '#666' }}>
                            {points.length === 0 ? 'Selecione uma rota para visualizar' :
                                validPoints.length === 0 ? 'Os pontos desta rota não têm coordenadas' : 'Carregando mapa...'}
                        </p>
                        {points.length > 0 && validPoints.length === 0 && (
                            <p style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
                                Para visualizar no mapa, edite os pontos e adicione latitude/longitude.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {selectedRoute && points.length > 0 && (
                <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '12px' }}>
                    <h3 style={{ marginBottom: '15px' }}>Sequência da Coleta</h3>
                    {points.map((point, idx) => (
                        <div key={point._id} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '10px', borderBottom: '1px solid #eee' }}>
                            <div style={{ width: '36px', height: '36px', background: idx === 0 ? '#4CAF50' : '#2196F3', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{idx + 1}</div>
                            <div style={{ flex: 1 }}>
                                <strong>{point.name}</strong>
                                <br />
                                <small>{point.address}</small>
                                {!point.latitude && <span style={{ color: '#ff9800', fontSize: '11px', marginLeft: '8px' }}>⚠️ Sem coordenadas</span>}
                            </div>
                            <div>{point.estimatedVolume || point.currentVolume || 0} kg</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default OptimizedRoutes;