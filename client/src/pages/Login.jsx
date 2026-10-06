import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, Building } from 'lucide-react';

export default function Login() {
  const { login, sessionExpired } = useAuth();
  const navigate   = useNavigate();

  const [companyId, setCompanyId] = useState('');
  const [password,  setPassword]  = useState('');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!companyId.trim()) {
      setError('Please enter your Company ID or Username.');
      return;
    }

    setLoading(true);
    try {
      await login(companyId.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(
        err?.message || 'Login failed. Please verify your Company ID and Password.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card" style={{ maxWidth: 420, padding: '40px 36px' }}>
        <img src="/ectron-logo.png" alt="ECTRON" className="login-logo" style={{ marginBottom: 4 }} />
        
        <div style={{ textAlign: 'center', marginTop: -12, marginBottom: 8 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy)', margin: 0 }}>
            Production Control System
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)', margin: '4px 0 0' }}>
            Sign in with your Company ID
          </p>
        </div>

        {sessionExpired && (
          <div style={{ 
            background: '#fffbeb', 
            border: '1px solid #fde68a', 
            color: '#b45309', 
            borderRadius: 8, 
            padding: '10px 14px', 
            fontSize: '0.82rem', 
            fontWeight: 600,
            textAlign: 'center',
            marginBottom: 14 
          }}>
            ⏱️ Your session expired due to 30 minutes of inactivity. Please log in again.
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit} noValidate style={{ width: '100%' }}>
          {error && <div className="login-error" style={{ textAlign: 'center', fontSize: '0.85rem' }}>{error}</div>}

          <div className="form-group">
            <label htmlFor="companyId" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Building size={15} color="var(--teal)" />
              Company ID
            </label>
            <input
              id="companyId"
              type="text"
              placeholder="Enter your Company ID"
              value={companyId}
              onChange={e => setCompanyId(e.target.value)}
              autoComplete="username"
              autoFocus
              disabled={loading}
              style={{ fontSize: '0.95rem' }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock size={15} color="var(--teal)" />
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
              style={{ fontSize: '0.95rem' }}
            />
          </div>

          <button 
            type="submit" 
            className="btn-login" 
            disabled={loading}
            style={{ 
              marginTop: 10, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: 8,
              fontSize: '0.95rem',
              fontWeight: 700,
              background: 'var(--teal)'
            }}
          >
            {loading ? <span className="spinner" /> : (
              <>
                <ShieldCheck size={18} />
                Sign In
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
