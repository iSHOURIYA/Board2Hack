import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import { useLobbyStore } from '../store/useLobbyStore';
import { useLocation } from 'wouter';
import type { RoomInfo } from '../types/api';
import { Users, Lock, Plus, Swords, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export const LobbyPage: React.FC = () => {
  const { rooms, isLoading, setRooms, setLoading } = useLobbyStore();
  const { profile, logout } = useAuthStore();
  const [, setLocation] = useLocation();

  const [createName, setCreateName] = useState('');
  const [createMax, setCreateMax] = useState(4);
  const [createPrivate, setCreatePrivate] = useState(false);
  const [createPassword, setCreatePassword] = useState('');
  
  const [joinPassword, setJoinPassword] = useState('');
  const [selectedPrivateRoomId, setSelectedPrivateRoomId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.rooms.list();
      setRooms(res.rooms);
    } catch (err: any) {
      setError(err.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, [setRooms, setLoading]);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 10000); // Polling every 10s
    return () => clearInterval(interval);
  }, [fetchRooms]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: createName.trim(),
        maxPlayers: Number(createMax),
        isPrivate: Boolean(createPrivate)
      };

      if (payload.isPrivate) {
        const passValue = createPassword.trim();
        if (passValue.length < 4) {
          throw new Error("Private room password must be at least 4 characters");
        }
        payload.password = passValue;
      }

      const res = await api.rooms.create(payload);
      setLocation(`/game/${res.roomId}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleJoin = async (room: RoomInfo) => {
    setError(null);
    if (room.isPrivate && selectedPrivateRoomId !== room.id) {
      setSelectedPrivateRoomId(room.id);
      return;
    }
    try {
      const res = await api.rooms.join(room.id, room.isPrivate ? joinPassword : '');
      setLocation(`/game/${res.roomId}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleMatchmake = async () => {
    setError(null);
    try {
      const res = await api.matchmake({ requiredPlayers: 2, region: 'global' });
      if (res.status === 'matched' && res.roomId) {
        setLocation(`/game/${res.roomId}`);
      } else {
        setError('In queue waiting for players...');
        // In a real scenario, socket.io matchmake event would be ideal, 
        // but contract says queued response.
        // We'll just list rooms again for now.
        fetchRooms();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    logout();
    setLocation('/');
  }

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <h1 className="title" style={{ margin: 0, fontSize: '2rem' }}>Lobby</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontWeight: 500, color: 'var(--accent-secondary)' }}>{profile?.username}</span>
          <button className="glass-button" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '8px 16px' }} onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      {error && (
        <div style={{ color: 'white', background: 'var(--accent-danger)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '2rem' }}>
        
        {/* Actions Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={20} /> Create Room
            </h2>
            <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input className="glass-input" placeholder="Room Name" value={createName} onChange={e => setCreateName(e.target.value)} required />
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Players:</span>
                <select className="glass-input" value={createMax} onChange={e => setCreateMax(Number(e.target.value))}>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                <input type="checkbox" checked={createPrivate} onChange={e => setCreatePrivate(e.target.checked)} />
                Private Room
              </label>
              {createPrivate && (
                <input className="glass-input" type="password" placeholder="Password" value={createPassword} onChange={e => setCreatePassword(e.target.value)} required />
              )}
              <button type="submit" className="glass-button primary">Create</button>
            </form>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent:'center', gap: '0.5rem' }}>
              <Swords size={20} /> Quick Match
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Find an open game and jump right into the action.
            </p>
            <button className="glass-button primary" style={{ width: '100%' }} onClick={handleMatchmake}>
              Find Match
            </button>
          </div>
        </div>

        {/* Room List */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2>Available Rooms</h2>
            <button className="glass-button" onClick={fetchRooms} disabled={isLoading} style={{ padding: '6px 12px', fontSize: '0.9rem' }}>
              Refresh
            </button>
          </div>

          {rooms.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              No rooms available. Create one to start!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {rooms.map(room => (
                <div key={room.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                  <div>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      {room.name} {room.isPrivate && <Lock size={16} color="var(--accent-primary)" />}
                    </h3>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Users size={14} /> {room.players.length} / {room.maxPlayers} • {room.status}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {selectedPrivateRoomId === room.id && room.isPrivate && (
                      <input 
                        type="password" 
                        className="glass-input" 
                        placeholder="Password" 
                        value={joinPassword}
                        onChange={e => setJoinPassword(e.target.value)}
                        style={{ width: '120px', padding: '8px 12px' }}
                      />
                    )}
                    <button 
                      className="glass-button"
                      onClick={() => handleJoin(room)}
                      disabled={room.players.length >= room.maxPlayers}
                    >
                      {selectedPrivateRoomId === room.id ? 'Confirm' : 'Join'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
