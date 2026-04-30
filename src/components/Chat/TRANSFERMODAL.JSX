import React, { useState, useEffect } from 'react';
import './TransferModal.css';

const TransferModal = ({ supports, onConfirm, onClose }) => {
  const [selectedSupport, setSelectedSupport] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSupports = supports.filter(support =>
    support.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    support.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    support.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleConfirm = () => {
    if (selectedSupport) {
      onConfirm(selectedSupport);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="transfer-modal">
        <div className="modal-header">
          <h3>
            <i className="fas fa-exchange-alt"></i>
            Transferir Chamado
          </h3>
          <button className="btn-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-description">
            Selecione um suporte para transferir este atendimento:
          </p>

          <div className="search-box">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Buscar suporte por nome, email ou departamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="supports-list">
            {filteredSupports.length === 0 ? (
              <div className="no-supports">
                <i className="fas fa-users-slash"></i>
                <p>Nenhum suporte disponível</p>
              </div>
            ) : (
              filteredSupports.map(support => (
                <div
                  key={support.id}
                  className={`support-item ${selectedSupport === support.id ? 'selected' : ''}`}
                  onClick={() => setSelectedSupport(support.id)}
                >
                  <div className="support-avatar">
                    <i className="fas fa-headset"></i>
                  </div>
                  <div className="support-info">
                    <div className="support-name">{support.name}</div>
                    <div className="support-details">
                      <span className="support-email">
                        <i className="fas fa-envelope"></i>
                        {support.email}
                      </span>
                      <span className="support-department">
                        <i className="fas fa-tag"></i>
                        {support.department}
                      </span>
                    </div>
                  </div>
                  {support.online && (
                    <span className="online-badge" title="Online">●</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn-confirm"
            onClick={handleConfirm}
            disabled={!selectedSupport}
          >
            Transferir Chamado
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferModal;