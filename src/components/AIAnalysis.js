import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './AIAnalysis.css';

const AIAnalysis = () => {
  const { api, user } = useAuth();
  const [selectedImage, setSelectedImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisMode, setAnalysisMode] = useState('standard'); // 'standard' ou 'gemini'
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [context, setContext] = useState({
    location: '',
    areaType: ''
  });
  const [error, setError] = useState(null);

  const areaTypes = [
    { value: 'parque', label: '🌳 Parque', icon: 'fa-tree' },
    { value: 'praia', label: '🏖️ Praia', icon: 'fa-umbrella-beach' },
    { value: 'rua', label: '🏙️ Rua/Avenida', icon: 'fa-road' },
    { value: 'evento', label: '🎪 Evento', icon: 'fa-calendar-alt' },
    { value: 'industria', label: '🏭 Indústria', icon: 'fa-factory' },
    { value: 'residencial', label: '🏠 Residencial', icon: 'fa-home' }
  ];

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) {
      setError('Selecione uma imagem primeiro');
      return;
    }

    setAnalyzing(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', selectedImage);
    formData.append('context', JSON.stringify(context));

    try {
      let response;

      if (analysisMode === 'gemini') {
        // Usar análise detalhada do Gemini
        response = await api.post('/gemini/analyze-upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        setResult({
          success: true,
          analysis: response.data.analysis,
          readableReport: response.data.readableReport,
          analysisId: response.data.analysisId,
          metadata: response.data.metadata
        });
      } else {
        // Usar análise padrão (simples)
        response = await api.post('/ai/analyze', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        setResult({
          success: true,
          standard: response.data,
          mode: 'standard'
        });
      }

      // Limpar preview após análise bem-sucedida
      if (response.data.success !== false) {
        // Não limpar para mostrar o resultado
      }

    } catch (err) {
      console.error('Erro na análise:', err);
      setError(err.response?.data?.error || 'Erro ao analisar a imagem. Tente novamente.');
    } finally {
      setAnalyzing(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await api.get('/analysis/history?limit=20');
      setHistory(response.data.analyses);
      setShowHistory(true);
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
      setError('Erro ao carregar histórico');
    }
  };

  const loadAnalysis = async (analysisId) => {
    setAnalyzing(true);
    try {
      const response = await api.get(`/analysis/${analysisId}`);
      setResult({
        success: true,
        analysis: response.data.analysis.analysis,
        readableReport: response.data.analysis.readableReport,
        analysisId: response.data.analysis._id,
        fromHistory: true
      });
      setShowHistory(false);
    } catch (err) {
      console.error('Erro ao carregar análise:', err);
      setError('Erro ao carregar análise');
    } finally {
      setAnalyzing(false);
    }
  };

  const shareAnalysis = async (analysisId) => {
    try {
      const response = await api.post(`/analysis/${analysisId}/share`);
      const shareUrl = response.data.shareUrl;

      // Copiar para clipboard
      await navigator.clipboard.writeText(shareUrl);
      alert(`Link copiado! Compartilhe com: ${shareUrl}`);
    } catch (err) {
      console.error('Erro ao compartilhar:', err);
      setError('Erro ao gerar link de compartilhamento');
    }
  };

  const deleteAnalysis = async (analysisId) => {
    if (window.confirm('Tem certeza que deseja deletar esta análise?')) {
      try {
        await api.delete(`/analysis/${analysisId}`);
        setHistory(history.filter(h => h._id !== analysisId));
        if (result?.analysisId === analysisId) {
          setResult(null);
        }
      } catch (err) {
        console.error('Erro ao deletar:', err);
        setError('Erro ao deletar análise');
      }
    }
  };

  const getGravidadeClass = (gravidade) => {
    const classes = {
      'leve': 'gravity-low',
      'moderada': 'gravity-medium',
      'grave': 'gravity-high',
      'critica': 'gravity-critical'
    };
    return classes[gravidade] || 'gravity-medium';
  };

  const renderGeminiReport = (analysis, readableReport, analysisId) => {
    const ident = analysis.identificacao || {};
    const impactos = analysis.impactos || {};
    const reciclagem = analysis.reciclabilidade || {};
    const recomendacoes = analysis.recomendacoes || {};
    const metricas = analysis.metricas || {};
    const resumo = analysis.resumo || {};

    return (
      <div className="gemini-report">
        <div className="report-header">
          <h3>
            <i className="fas fa-chart-line"></i>
            Relatório Completo - Gemini AI
          </h3>
          {analysisId && (
            <div className="report-actions">
              <button onClick={() => shareAnalysis(analysisId)} className="btn-share">
                <i className="fas fa-share-alt"></i> Compartilhar
              </button>
            </div>
          )}
        </div>

        {/* Resumo Executivo */}
        <div className={`summary-card ${getGravidadeClass(resumo.gravidade)}`}>
          <div className="summary-header">
            <i className="fas fa-chart-simple"></i>
            <span>Gravidade: {resumo.gravidade?.toUpperCase()}</span>
          </div>
          <div className="summary-actions">
            {resumo.acoes_imediatas?.map((acao, idx) => (
              <div key={idx} className="action-item">
                <i className="fas fa-bolt"></i> {acao}
              </div>
            ))}
          </div>
        </div>

        {/* Identificação */}
        <div className="report-section">
          <h4><i className="fas fa-eye"></i> Resíduos Identificados</h4>
          <div className="waste-types">
            {ident.tipos_detectados?.length > 0 ? (
              ident.tipos_detectados.map((tipo, idx) => (
                <div key={idx} className="waste-type-badge">
                  <span className="type-name">{tipo.tipo}</span>
                  <span className="type-percent">{tipo.porcentagem}%</span>
                  <span className="type-quantity">{tipo.quantidade_estimada}</span>
                </div>
              ))
            ) : (
              <p>Nenhum resíduo específico identificado</p>
            )}
          </div>
          <div className="metrics-row">
            <span><i className="fas fa-cube"></i> Volume: {ident.volume_total_m3} m³</span>
            <span><i className="fas fa-arrows-spread"></i> Dispersão: {ident.dispersao}</span>
          </div>
        </div>

        {/* Impactos Ambientais */}
        <div className="report-section">
          <h4><i className="fas fa-globe-americas"></i> Impactos Ambientais</h4>
          <div className={`impact-level level-${impactos.nivel_critico}`}>
            Nível Crítico: {impactos.nivel_critico?.toUpperCase()}
          </div>
          {impactos.por_tipo?.map((impacto, idx) => (
            <div key={idx} className="impact-item">
              <strong>{impacto.material}</strong>
              <p><i className="fas fa-hourglass-half"></i> Decomposição: {impacto.tempo_decomposicao}</p>
              <p><i className="fas fa-skull-crosswalk"></i> Riscos: {impacto.riscos}</p>
            </div>
          ))}
        </div>

        {/* Reciclagem */}
        <div className="report-section">
          <h4><i className="fas fa-recycle"></i> Potencial de Reciclagem</h4>
          <div className="recycling-stats">
            <div className="stat-circle">
              <span className="stat-number">{reciclagem.taxa_reciclavel_percentual}%</span>
              <span className="stat-label">Reciclável</span>
            </div>
            <div className="stat-value">
              <span>💰 Potencial econômico: R$ {reciclagem.potencial_economico_estimado_reais?.toLocaleString()}</span>
              <span>♻️ Materiais: {reciclagem.materiais_aproveitaveis?.join(', ') || 'Nenhum'}</span>
            </div>
          </div>
        </div>

        {/* Recomendações */}
        <div className="report-section">
          <h4><i className="fas fa-clipboard-list"></i> Recomendações Operacionais</h4>
          <div className="recommendations">
            <div className="rec-item">
              <i className="fas fa-flag-checkered"></i> Prioridade: {recomendacoes.prioridade?.toUpperCase()}
            </div>
            <div className="rec-item">
              <i className="fas fa-truck"></i> Método: {recomendacoes.metodo_coleta}
            </div>
            <div className="rec-item">
              <i className="fas fa-users"></i> Equipe: {recomendacoes.pessoas_estimadas} pessoas
            </div>
            <div className="rec-item">
              <i className="fas fa-clock"></i> Tempo estimado: {recomendacoes.tempo_estimado_horas} horas
            </div>
            <div className="rec-item">
              <i className="fas fa-tools"></i> Equipamentos: {recomendacoes.equipamentos?.join(', ')}
            </div>
          </div>
        </div>

        {/* Métricas */}
        <div className="metrics-grid">
          <div className="metric-card">
            <i className="fas fa-chart-line"></i>
            <span className="metric-value">{metricas.indice_impacto_ambiental}/100</span>
            <span className="metric-label">Índice de Impacto</span>
          </div>
          <div className="metric-card">
            <i className="fas fa-cloud"></i>
            <span className="metric-value">{metricas.economia_co2_kg?.toLocaleString()} kg</span>
            <span className="metric-label">CO₂ evitado</span>
          </div>
          <div className="metric-card">
            <i className="fas fa-tree"></i>
            <span className="metric-value">{metricas.arvores_equivalentes}</span>
            <span className="metric-label">Árvores equivalentes</span>
          </div>
          <div className="metric-card">
            <i className="fas fa-water"></i>
            <span className="metric-value">{metricas.agua_preservada_litros?.toLocaleString()} L</span>
            <span className="metric-label">Água preservada</span>
          </div>
        </div>

        {/* Mensagem de conscientização */}
        <div className="awareness-message">
          <i className="fas fa-heart"></i>
          <p>{resumo.mensagem_conscientizacao}</p>
        </div>

        {/* Relatório legível */}
        <div className="readable-report">
          <h4><i className="fas fa-file-alt"></i> Relário em texto</h4>
          <pre className="report-text">{readableReport}</pre>
        </div>
      </div>
    );
  };

  const renderStandardReport = (result) => {
    return (
      <div className="standard-report">
        <div className="stats-summary">
          <div className="stat">
            <span className="stat-value">{result.total_residuos}</span>
            <span className="stat-label">Resíduos Detectados</span>
          </div>
        </div>

        <div className={`sugestao-card ${result.sugestao?.includes('URGENTE') ? 'urgent' : result.sugestao?.includes('Atenção') ? 'warning' : 'normal'}`}>
          <i className="fas fa-lightbulb"></i>
          <span>{result.sugestao}</span>
        </div>

        <div className="deteccoes-list">
          <h4>Detecções:</h4>
          <div className="deteccoes-grid">
            {result.deteccoes?.map((det, index) => (
              <div key={index} className="deteccao-card">
                <span className="deteccao-icon">{getTipoIcon(det.tipo)}</span>
                <div className="deteccao-info">
                  <span className="deteccao-tipo">{det.tipo}</span>
                  <span className="deteccao-confianca">
                    Confiança: {(det.confianca * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="confidence-bar">
                  <div className="confidence-fill" style={{ width: `${det.confianca * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const getTipoIcon = (tipo) => {
    const icons = {
      'plastico': '🥤',
      'papel': '📄',
      'vidro': '🍾',
      'metal': '🥫',
      'organico': '🍌',
      'entulho': '🧱'
    };
    return icons[tipo] || '🗑️';
  };

  return (
    <div className="ai-analysis-container">
      <div className="ai-header">
        <h2>
          <i className="fas fa-robot"></i>
          Análise por Inteligência Artificial
        </h2>
        <p>Faça upload de uma imagem para análise detalhada de resíduos</p>
      </div>

      <div className="analysis-mode-selector">
        <button
          className={`mode-btn ${analysisMode === 'standard' ? 'active' : ''}`}
          onClick={() => setAnalysisMode('standard')}
        >
          <i className="fas fa-microchip"></i> Análise Rápida
        </button>
        <button
          className={`mode-btn ${analysisMode === 'gemini' ? 'active' : ''}`}
          onClick={() => setAnalysisMode('gemini')}
        >
          <i className="fab fa-google"></i> Análise Detalhada (Gemini AI)
        </button>
      </div>

      <div className="ai-content">
        <div className="upload-area">
          <div className="upload-box" onClick={() => document.getElementById('imageInput').click()}>
            {preview ? (
              <img src={preview} alt="Preview" className="image-preview" />
            ) : (
              <>
                <i className="fas fa-cloud-upload-alt"></i>
                <p>Clique ou arraste uma imagem</p>
                <span>Formatos: JPG, PNG (máx. 10MB)</span>
              </>
            )}
            <input
              id="imageInput"
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/webp"
              onChange={handleImageChange}
              style={{ display: 'none' }}
            />
          </div>

          {analysisMode === 'gemini' && selectedImage && (
            <div className="context-fields">
              <select
                value={context.areaType}
                onChange={(e) => setContext({ ...context, areaType: e.target.value })}
                className="context-select"
              >
                <option value="">Tipo de área (opcional)</option>
                {areaTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Localização (ex: Parque Ibirapuera, São Paulo - SP)"
                value={context.location}
                onChange={(e) => setContext({ ...context, location: e.target.value })}
                className="context-input"
              />
            </div>
          )}

          {selectedImage && (
            <button className="btn-analyze" onClick={handleAnalyze} disabled={analyzing}>
              {analyzing ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Analisando...
                </>
              ) : (
                <>
                  <i className="fas fa-microchip"></i>
                  {analysisMode === 'gemini' ? 'Analisar com Gemini AI' : 'Analisar com IA'}
                </>
              )}
            </button>
          )}
        </div>

        {error && (
          <div className="error-message">
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}

        {result && result.success && (
          <div className="results-area">
            {analysisMode === 'gemini' && result.analysis ? (
              renderGeminiReport(result.analysis, result.readableReport, result.analysisId)
            ) : result.standard ? (
              renderStandardReport(result.standard)
            ) : null}

            <div className="actions">
              <button className="btn-new" onClick={() => {
                setSelectedImage(null);
                setPreview(null);
                setResult(null);
                setContext({ location: '', areaType: '' });
              }}>
                <i className="fas fa-plus"></i>
                Nova Análise
              </button>
              <button className="btn-history" onClick={fetchHistory}>
                <i className="fas fa-history"></i>
                Meu Histórico
              </button>
              <button className="btn-route" onClick={() => window.location.href = '/dashboard/routes'}>
                <i className="fas fa-route"></i>
                Criar Rota
              </button>
            </div>
          </div>
        )}

        {/* Modal de Histórico */}
        {showHistory && (
          <div className="history-modal">
            <div className="history-modal-content">
              <div className="history-modal-header">
                <h3><i className="fas fa-history"></i> Histórico de Análises</h3>
                <button onClick={() => setShowHistory(false)} className="close-btn">&times;</button>
              </div>
              <div className="history-list">
                {history.length === 0 ? (
                  <p>Nenhuma análise encontrada</p>
                ) : (
                  history.map(item => (
                    <div key={item._id} className="history-item">
                      <div className="history-info">
                        <span className="history-name">{item.imageName || `Análise ${new Date(item.createdAt).toLocaleDateString()}`}</span>
                        <span className="history-date">{new Date(item.createdAt).toLocaleString()}</span>
                        {item.summary && (
                          <span className={`history-gravity ${item.summary.gravidade}`}>
                            {item.summary.gravidade}
                          </span>
                        )}
                      </div>
                      <div className="history-actions">
                        <button onClick={() => loadAnalysis(item._id)} className="btn-view">
                          <i className="fas fa-eye"></i>
                        </button>
                        <button onClick={() => shareAnalysis(item._id)} className="btn-share">
                          <i className="fas fa-share-alt"></i>
                        </button>
                        <button onClick={() => deleteAnalysis(item._id)} className="btn-delete">
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAnalysis;