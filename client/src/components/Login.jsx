import React, { useState } from 'react';
import { Package, Lock, User, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';

export function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Authentication failed.');
        return;
      }

      // Store session token in localStorage
      localStorage.setItem('vyapar_token', data.token);
      localStorage.setItem('vyapar_user', JSON.stringify(data.user));

      onLoginSuccess(data.user);
    } catch (err) {
      setError('Network connection error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      background: 'radial-gradient(circle at top, #1e293b 0%, #090e1a 100%)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 440,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-highlight)',
        borderRadius: 'var(--radius-xl)',
        padding: '36px 32px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(16px)'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56,
            height: 56,
            background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: '#fff',
            boxShadow: '0 8px 24px var(--primary-glow)'
          }}>
            <Package size={30} />
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            DG Billing
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 4 }}>
            GST Billing, Inventory & Accounting Platform
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#F87171',
            fontSize: '0.88rem'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Username or Email</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                required
                className="form-input" 
                style={{ paddingLeft: 42 }}
                placeholder="Enter your username or email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text-muted)' }} />
              <input 
                type={showPassword ? 'text' : 'password'} 
                required
                className="form-input" 
                style={{ paddingLeft: 42, paddingRight: 42 }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: 10,
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: 4
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px 20px', fontSize: '1rem', fontWeight: 700 }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : (
              <>Sign In to Workspace <ArrowRight size={18} /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
