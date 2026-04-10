import React, { useEffect } from 'react';
import { Switch, Route, Redirect } from 'wouter';
import { useAuthStore } from './store/useAuthStore';
import { api } from './services/api';
import { AuthPage } from './pages/AuthPage';
import { LobbyPage } from './pages/LobbyPage';
import { GamePage } from './pages/GamePage';
import './index.css';

const App: React.FC = () => {
  const { isAuthenticated, profile, setProfile, logout } = useAuthStore();
  const loadingProfile = isAuthenticated && !profile;

  useEffect(() => {
    if (!isAuthenticated || profile) return;

    api.profile()
      .then(res => {
        setProfile(res);
      })
      .catch(() => {
        logout();
      });
  }, [isAuthenticated, profile, setProfile, logout]);

  if (loadingProfile) {
    return <div style={{ display: 'grid', placeItems: 'center', height: '100vh', color: 'var(--text-primary)' }}>Loading Profile...</div>;
  }

  return (
    <div className="app-root">
      <Switch>
        <Route path="/">
          {isAuthenticated ? <Redirect to="/lobby" /> : <AuthPage />}
        </Route>
        
        <Route path="/lobby">
          {isAuthenticated ? <LobbyPage /> : <Redirect to="/" />}
        </Route>
        
        <Route path="/game/:roomId">
          {isAuthenticated ? <GamePage /> : <Redirect to="/" />}
        </Route>

        <Route>
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h1 className="title">404 - Not Found</h1>
          </div>
        </Route>
      </Switch>
    </div>
  );
};

export default App;
