import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    city: '',
    state: '',
    userType: 'COOPERATIVE' // COOPERATIVE, COMPANY, LOGISTICS, SUPPORT
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { register } = useAuth();

  // Tipos de usuário
  const userTypes = [
    { id: 'COOPERATIVE', label: 'Cooperativa', icon: 'fas fa-hand-holding-heart' },
    { id: 'COMPANY', label: 'Empresa', icon: 'fas fa-building' },
    { id: 'LOGISTICS', label: 'Logística', icon: 'fas fa-truck' },
    { id: 'SUPPORT', label: 'Suporte', icon: 'fas fa-headset' }
  ];

  // Estados brasileiros
  const brazilStates = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
    'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
    'SP', 'SE', 'TO'
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Adicionar role baseado no tipo selecionado
    const userData = {
      ...formData,
      role: formData.userType
    };

    const result = await register(userData);
    
    if (result.success) {
      navigate('/login');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-logo">
          <i className="fas fa-recycle"></i>
          <h1>EcoRoute</h1>
          <p>Crie sua conta</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* SELEÇÃO DE TIPO DE PERFIL - NOVO! */}
          <div className="user-type-selector">
            <label>Tipo de Perfil</label>
            <div className="type-options">
              {userTypes.map(type => (
                <label key={type.id} className="type-option">
                  <input
                    type="radio"
                    name="userType"
                    value={type.id}
                    checked={formData.userType === type.id}
                    onChange={handleChange}
                  />
                  <span className="type-content">
                    <i className={type.icon}></i>
                    {type.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="input-group">
            <i className="fas fa-user"></i>
            <input
              type="text"
              name="name"
              placeholder="Nome completo"
              value={formData.name}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <i className="fas fa-envelope"></i>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <i className="fas fa-phone"></i>
            <input
              type="tel"
              name="phone"
              placeholder="Telefone"
              value={formData.phone}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div className="input-group">
            <i className="fas fa-lock"></i>
            <input
              type="password"
              name="password"
              placeholder="Senha"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <div className="input-row">
            <div className="input-group half">
              <i className="fas fa-city"></i>
              <input
                type="text"
                name="city"
                placeholder="Cidade"
                value={formData.city}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="input-group half">
              <i className="fas fa-map-marker-alt"></i>
              <select
                name="state"
                value={formData.state}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="">UF</option>
                {brazilStates.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-register"
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner"></i>
                Cadastrando...
              </>
            ) : (
              "Cadastrar"
            )}
          </button>
        </form>

        <p className="login-link">
          Já tem uma conta? <Link to="/login">Fazer login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;