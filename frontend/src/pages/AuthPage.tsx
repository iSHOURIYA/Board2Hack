import React, { useState } from 'react';
import { api } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { useLocation } from 'wouter';
import { Flame } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setToken = useAuthStore((s) => s.setToken);
  const [, setLocation] = useLocation();

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      if (isLogin) {
        if (password.length < 8) throw new Error("Password must be at least 8 characters");
        const res = await api.auth.login({ identity, password });
        setToken(res.token);
      } else {
        if (username.length < 3 || username.length > 32) throw new Error("Username must be between 3 and 32 characters");
        if (password.length < 8) throw new Error("Password must be at least 8 characters");
        const res = await api.auth.register({ email: identity, username, password });
        setToken(res.token);
      }
      // On success, go to lobby
      setLocation('/lobby');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'An error occurred during authentication'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel animate-slide-in" style={{ padding: '3rem', width: '100%', maxWidth: '420px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <Flame size={48} color="var(--accent-primary)" />
        </div>
        <h1 className="title" style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>
          Tiki Topple
        </h1>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {error && (
            <div style={{ color: 'var(--accent-danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          {!isLogin && (
            <input 
              className="glass-input" 
              placeholder="Username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          )}

          <input 
            className="glass-input" 
            placeholder={isLogin ? 'Username or Email' : 'Email'} 
            type={isLogin ? 'text' : 'email'}
            value={identity}
            onChange={(e) => setIdentity(e.target.value)}
            required
          />

          <input 
            className="glass-input" 
            placeholder="Password" 
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button className="glass-button primary" type="submit" disabled={loading} style={{ marginTop: '1rem' }}>
            {loading ? 'Authenticating...' : (isLogin ? 'Enter the Match' : 'Create Account')}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', textDecoration: 'underline' }}
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </div>
      </div>
    </div>
  );
};
