import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

const Impact = () => {
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedPoint, setSelectedPoint] = useState('');
  const [points, setPoints] = useState([]);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [impact, setImpact] = useState({
    treesSaved: 0,
    waterSaved: 0,
    energySaved: 0,
    carbonSaved: 0,
    recyclingRate: 0,
    co2Reduction: 0,
    fuelSaved: 0,
    wasteDiverted: 0
  });
  const [evolutionData, setEvolutionData] = useState({
    labels: [],
    actual: [],
    goal: []
  });
  const [wasteDistribution, setWasteDistribution] = useState({
    labels: [],
    data: []
  });
  const [benefitsDetail, setBenefitsDetail] = useState([]);

  // Carregar pontos de coleta para o filtro
  const loadPoints = async () => {
    try {
      const response = await api.get('/points');
      setPoints(response.data);
    } catch (error) {
      console.error('Erro ao carregar pontos:', error);
    }
  };

  // Carregar dados reais
  const loadImpactData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Construir URL com parâmetros
      let summaryUrl = '/impact/summary';
      let evolutionUrl = `/impact/evolution?period=${selectedPeriod}`;
      let distributionUrl = '/impact/waste-distribution';
      let benefitsUrl = '/impact/benefits';

      // Adicionar filtro de ponto
      if (selectedPoint) {
        summaryUrl += `?pointId=${selectedPoint}`;
        evolutionUrl += `&pointId=${selectedPoint}`;
        distributionUrl += `?pointId=${selectedPoint}`;
      }

      // Adicionar filtro de data personalizada
      if (showCustomDate && customStartDate && customEndDate) {
        evolutionUrl += `&startDate=${customStartDate}&endDate=${customEndDate}`;
      }

      const [impactRes, evolutionRes, distributionRes, benefitsRes] = await Promise.all([
        api.get(summaryUrl).catch(() => ({ data: null })),
        api.get(evolutionUrl).catch(() => ({ data: null })),
        api.get(distributionUrl).catch(() => ({ data: null })),
        api.get(benefitsUrl).catch(() => ({ data: null }))
      ]);

      if (impactRes.data) {
        setImpact({
          treesSaved: impactRes.data.treesSaved || 0,
          waterSaved: impactRes.data.waterSaved || 0,
          energySaved: impactRes.data.energySaved || 0,
          carbonSaved: impactRes.data.carbonSaved || 0,
          recyclingRate: impactRes.data.recyclingRate || 0,
          co2Reduction: impactRes.data.co2Reduction || 0,
          fuelSaved: impactRes.data.fuelSaved || 0,
          wasteDiverted: impactRes.data.wasteDiverted || 0
        });
      }

      if (evolutionRes.data && evolutionRes.data.labels) {
        setEvolutionData({
          labels: evolutionRes.data.labels,
          actual: evolutionRes.data.actual,
          goal: evolutionRes.data.goal
        });
      }

      if (distributionRes.data && distributionRes.data.labels) {
        setWasteDistribution({
          labels: distributionRes.data.labels,
          data: distributionRes.data.data
        });
      }

      if (benefitsRes.data && benefitsRes.data.benefits) {
        setBenefitsDetail(benefitsRes.data.benefits);
      }

    } catch (err) {
      console.error('Erro ao carregar dados de impacto:', err);
      setError('Erro ao carregar dados de impacto. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPoints();
  }, []);

  useEffect(() => {
    loadImpactData();
  }, [selectedPeriod, selectedPoint, customStartDate, customEndDate, showCustomDate]);

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    if (period !== 'custom') {
      setShowCustomDate(false);
    } else {
      setShowCustomDate(true);
      // Definir datas padrão (últimos 30 dias)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      setCustomStartDate(startDate.toISOString().split('T')[0]);
      setCustomEndDate(endDate.toISOString().split('T')[0]);
    }
  };

  const applyCustomDate = () => {
    if (customStartDate && customEndDate) {
      loadImpactData();
    }
  };

  const evolutionChartData = {
    labels: evolutionData.labels,
    datasets: [
      {
        label: 'CO₂ Evitado (kg)',
        data: evolutionData.actual,
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#4CAF50',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Meta',
        data: evolutionData.goal,
        borderColor: '#FF9800',
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0.4,
      }
    ]
  };

  const wasteDistributionData = {
    labels: wasteDistribution.labels,
    datasets: [
      {
        data: wasteDistribution.data,
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4CAF50',
          '#FF9F40',
          '#9C27B0',
          '#999999'
        ],
        borderWidth: 0,
      }
    ]
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          font: { size: 12 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.raw.toLocaleString()} kg`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: {
          callback: value => value.toLocaleString() + ' kg',
          font: { size: 11 }
        }
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 } }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { size: 12 },
          generateLabels: (chart) => {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label, i) => ({
                text: `${label}: ${data.datasets[0].data[i].toLocaleString()} kg`,
                fillStyle: data.datasets[0].backgroundColor[i],
                strokeStyle: 'transparent',
                lineWidth: 0,
                hidden: false,
                index: i
              }));
            }
            return [];
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const total = wasteDistribution.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
            return `${context.label}: ${context.raw.toLocaleString()} kg (${percentage}%)`;
          }
        }
      }
    }
  };

  const totalWaste = wasteDistribution.data.reduce((a, b) => a + b, 0);
  const getGoalPercentage = () => {
    const totalActual = evolutionData.actual.reduce((a, b) => a + b, 0);
    const totalGoal = evolutionData.goal.reduce((a, b) => a + b, 0);
    if (totalGoal === 0) return 0;
    return Math.round((totalActual / totalGoal) * 100);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Carregando dados de impacto...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <i className="fas fa-exclamation-triangle"></i>
        <p>{error}</p>
        <button onClick={() => loadImpactData()} className="btn-primary">Tentar Novamente</button>
      </div>
    );
  }

  const selectedPointName = points.find(p => p._id === selectedPoint)?.name || 'Todos os pontos';

  return (
    <div className="impact-container" style={{ padding: '20px' }}>
      <div className="impact-header" style={{ marginBottom: '25px' }}>
        <div>
          <h2 style={{ margin: '0 0 8px 0' }}>Impacto Ambiental</h2>
          <p className="impact-subtitle" style={{ color: '#666', margin: 0 }}>Acompanhe o impacto positivo das suas ações</p>
        </div>

        <div className="filters-section" style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap', marginTop: '15px' }}>
          {/* Filtro por ponto de coleta */}
          <div className="point-filter" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fas fa-map-marker-alt" style={{ color: '#4CAF50' }}></i>
            <select
              value={selectedPoint}
              onChange={(e) => setSelectedPoint(e.target.value)}
              style={{
                padding: '10px 15px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                backgroundColor: 'white',
                minWidth: '220px',
                cursor: 'pointer'
              }}
            >
              <option value="">Todos os pontos</option>
              {points.map(point => (
                <option key={point._id} value={point._id}>
                  {point.name} - {point.city}/{point.state}
                </option>
              ))}
            </select>
          </div>

          {/* Período de tempo */}
          <div className="period-selector" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className={`period-btn ${selectedPeriod === 'week' ? 'active' : ''}`}
              onClick={() => handlePeriodChange('week')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                background: selectedPeriod === 'week' ? '#4CAF50' : 'white',
                color: selectedPeriod === 'week' ? 'white' : '#333',
                cursor: 'pointer'
              }}
            >
              <i className="fas fa-calendar-week"></i> Semana
            </button>
            <button
              className={`period-btn ${selectedPeriod === 'month' ? 'active' : ''}`}
              onClick={() => handlePeriodChange('month')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                background: selectedPeriod === 'month' ? '#4CAF50' : 'white',
                color: selectedPeriod === 'month' ? 'white' : '#333',
                cursor: 'pointer'
              }}
            >
              <i className="fas fa-calendar-alt"></i> Mês
            </button>
            <button
              className={`period-btn ${selectedPeriod === 'year' ? 'active' : ''}`}
              onClick={() => handlePeriodChange('year')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                background: selectedPeriod === 'year' ? '#4CAF50' : 'white',
                color: selectedPeriod === 'year' ? 'white' : '#333',
                cursor: 'pointer'
              }}
            >
              <i className="fas fa-calendar"></i> Ano
            </button>
            <button
              className={`period-btn ${selectedPeriod === 'custom' ? 'active' : ''}`}
              onClick={() => handlePeriodChange('custom')}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                background: selectedPeriod === 'custom' ? '#4CAF50' : 'white',
                color: selectedPeriod === 'custom' ? 'white' : '#333',
                cursor: 'pointer'
              }}
            >
              <i className="fas fa-calendar-plus"></i> Personalizado
            </button>
          </div>
        </div>

        {/* Datas personalizadas */}
        {showCustomDate && (
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginTop: '15px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px', color: '#666' }}>Data inicial</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '5px', color: '#666' }}>Data final</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              />
            </div>
            <button
              onClick={applyCustomDate}
              style={{
                marginTop: '20px',
                padding: '8px 20px',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Aplicar Filtro
            </button>
          </div>
        )}
      </div>

      {selectedPoint && (
        <div className="filter-info" style={{ marginBottom: '20px', padding: '10px 15px', background: '#e8f5e9', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="fas fa-info-circle" style={{ color: '#4CAF50' }}></i>
          <span>Mostrando dados para: <strong>{selectedPointName}</strong></span>
        </div>
      )}

      {/* Cards de impacto principal */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: 'linear-gradient(135deg, #4CAF50, #2E7D32)', padding: '20px', borderRadius: '12px', color: 'white' }}>
          <i className="fas fa-tree" style={{ fontSize: '32px', opacity: 0.8 }}></i>
          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '13px', opacity: 0.8 }}>Árvores Preservadas</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{impact.treesSaved.toLocaleString()}</div>
          </div>
        </div>

        <div style={{ background: '#2196F3', padding: '20px', borderRadius: '12px', color: 'white' }}>
          <i className="fas fa-water" style={{ fontSize: '32px', opacity: 0.8 }}></i>
          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '13px', opacity: 0.8 }}>Água Economizada</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{impact.waterSaved.toLocaleString()} L</div>
          </div>
        </div>

        <div style={{ background: '#FF9800', padding: '20px', borderRadius: '12px', color: 'white' }}>
          <i className="fas fa-bolt" style={{ fontSize: '32px', opacity: 0.8 }}></i>
          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '13px', opacity: 0.8 }}>Energia Economizada</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{impact.energySaved.toLocaleString()} kWh</div>
          </div>
        </div>

        <div style={{ background: '#9C27B0', padding: '20px', borderRadius: '12px', color: 'white' }}>
          <i className="fas fa-leaf" style={{ fontSize: '32px', opacity: 0.8 }}></i>
          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '13px', opacity: 0.8 }}>CO₂ Evitado</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{impact.carbonSaved.toLocaleString()} kg</div>
          </div>
        </div>
      </div>

      {/* Métricas secundárias */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
        <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
          <i className="fas fa-chart-line" style={{ fontSize: '24px', color: '#4CAF50' }}></i>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Taxa de Reciclagem</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{impact.recyclingRate}%</div>
          <div style={{ height: '6px', background: '#e0e0e0', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
            <div style={{ width: `${impact.recyclingRate}%`, height: '100%', background: '#4CAF50', borderRadius: '3px' }}></div>
          </div>
        </div>

        <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
          <i className="fas fa-industry" style={{ fontSize: '24px', color: '#2196F3' }}></i>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Redução de CO₂</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{impact.co2Reduction.toLocaleString()} kg</div>
          <div style={{ fontSize: '11px', color: '#999' }}>Equivalente a {Math.round(impact.co2Reduction / 20)} carros/ano</div>
        </div>

        <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
          <i className="fas fa-gas-pump" style={{ fontSize: '24px', color: '#FF9800' }}></i>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Combustível Economizado</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{impact.fuelSaved.toLocaleString()} L</div>
          <div style={{ fontSize: '11px', color: '#999' }}>Rotas otimizadas</div>
        </div>

        <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
          <i className="fas fa-trash-alt" style={{ fontSize: '24px', color: '#9C27B0' }}></i>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Resíduos Desviados</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{impact.wasteDiverted.toLocaleString()} kg</div>
          <div style={{ fontSize: '11px', color: '#999' }}>De aterros sanitários</div>
        </div>
      </div>

      {/* Gráficos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '25px', marginBottom: '30px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <i className="fas fa-chart-line" style={{ fontSize: '20px', color: '#4CAF50' }}></i>
            <h3 style={{ margin: 0 }}>Evolução da Redução de CO₂</h3>
          </div>
          <div style={{ height: '350px' }}>
            {evolutionData.actual.length > 0 ? (
              <Line data={evolutionChartData} options={lineOptions} />
            ) : (
              <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>
                <i className="fas fa-chart-line" style={{ fontSize: '48px', marginBottom: '10px' }}></i>
                <p>Nenhum dado de evolução disponível</p>
              </div>
            )}
          </div>
          <div style={{ marginTop: '15px', textAlign: 'center' }}>
            <span style={{ background: '#f0f0f0', padding: '6px 12px', borderRadius: '20px', fontSize: '13px' }}>
              <i className="fas fa-trophy"></i> Meta anual: {getGoalPercentage()}% atingida
            </span>
          </div>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <i className="fas fa-chart-pie" style={{ fontSize: '20px', color: '#FF9800' }}></i>
            <h3 style={{ margin: 0 }}>Distribuição por Tipo de Resíduo</h3>
          </div>
          <div style={{ height: '350px' }}>
            {totalWaste > 0 ? (
              <Doughnut data={wasteDistributionData} options={doughnutOptions} />
            ) : (
              <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>
                <i className="fas fa-chart-pie" style={{ fontSize: '48px', marginBottom: '10px' }}></i>
                <p>Nenhum dado de distribuição disponível</p>
              </div>
            )}
          </div>
          <div style={{ marginTop: '15px', textAlign: 'center' }}>
            <span style={{ background: '#f0f0f0', padding: '6px 12px', borderRadius: '20px', fontSize: '13px' }}>
              <i className="fas fa-weight-hanging"></i> Total: {totalWaste.toLocaleString()} kg
            </span>
          </div>
        </div>
      </div>

      {/* Benefícios detalhados */}
      {benefitsDetail.length > 0 && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginBottom: '20px' }}><i className="fas fa-star"></i> Impacto Detalhado</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {benefitsDetail.map((benefit, index) => (
              <div key={benefit.id || index} style={{ padding: '15px', background: '#f9f9f9', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <i className={`fas fa-${benefit.icon || 'leaf'}`} style={{ fontSize: '24px', color: '#4CAF50' }}></i>
                  <h4 style={{ margin: 0 }}>{benefit.title}</h4>
                </div>
                <p style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>{benefit.description}</p>
                <div style={{ display: 'flex', gap: '15px', fontSize: '12px' }}>
                  {benefit.stats?.map((stat, idx) => (
                    <div key={idx}>
                      <span style={{ color: '#999' }}>{stat.label}:</span>
                      <strong style={{ display: 'block', color: '#4CAF50' }}>{stat.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Impact;