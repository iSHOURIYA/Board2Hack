import React from 'react';
import { Switch, Route, Redirect } from 'wouter';
import { useAuthStore } from './store/useAuthStore';
import { AuthPage } from './pages/AuthPage';
import { LobbyPage } from './pages/LobbyPage';
import { GamePage } from './pages/GamePage';
import './index.css';

const App: React.FC = () => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

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
