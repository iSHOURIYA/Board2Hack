import React, { useEffect, useState } from 'react';
import { useRoute } from 'wouter';
import { socketService } from '../services/socket';
import { useGameStore } from '../store/useGameStore';
import { useAuthStore } from '../store/useAuthStore';
import type { CardId, TikiId } from '../types/game';
import { TotemStack } from '../components/TotemStack';
import { PlayerHand } from '../components/PlayerHand';
import { PlayerInfo } from '../components/PlayerInfo';
import { AlertCircle, Clock } from 'lucide-react';

export const GamePage: React.FC = () => {
  const [, params] = useRoute('/game/:roomId');
  const roomId = params?.roomId;
  
  const { profile } = useAuthStore();
  const { 
    boardState, 
    roomJoinedData, 
    pendingMove, 
    errorEventMessage,
    setBoardState,
    setRoomJoinedData,
    setErrorEvent,
    setPendingMove,
    clearRoom
  } = useGameStore();

  const [selectedCard, setSelectedCard] = useState<CardId | undefined>();
  const [selectedTiki, setSelectedTiki] = useState<TikiId | undefined>();

  useEffect(() => {
    if (!roomId) return;

    socketService.connect();

    socketService.on('room_joined', (payload) => {
      setRoomJoinedData(payload);
    });

    socketService.on('state_update', (payload) => {
      setBoardState(payload);
    });

    socketService.on('error_event', (payload) => {
      setErrorEvent(payload.message);
      // Auto-clear toast after 3s
      setTimeout(() => setErrorEvent(null), 3000);
    });

    const handleConnect = () => {
      socketService.joinRoom({ roomId });
    };
    
    socketService.onConnect(handleConnect);
    
    // Join immediately if already connected, else it awaits the connect event
    if (socketService.isConnected) {
      socketService.joinRoom({ roomId });
    }

    return () => {
      socketService.offConnect(handleConnect);
      socketService.off('room_joined', setRoomJoinedData as any);
      socketService.off('state_update', setBoardState as any);
      socketService.off('error_event', setErrorEvent as any);
      clearRoom();
      // Optionally could disconnect, but typical SPA keeps it alive.
    };
  }, [roomId, setBoardState, setRoomJoinedData, setErrorEvent, clearRoom]);

  const handleStartGame = () => {
    if (roomId) socketService.startGame({ roomId });
  };

  const handlePlayCard = () => {
    if (!roomId || !selectedCard || !profile || pendingMove) return;
    
    const requiresTarget = selectedCard !== 'TIKI_TOAST';
    if (requiresTarget && selectedTiki === undefined) {
      setErrorEvent('Please select a Tiki target for this card.');
      return;
    }

    const targetTikiId = requiresTarget ? selectedTiki : undefined;
    const payload = { roomId, card: selectedCard, targetTikiId };
    socketService.playCard(payload);
    setPendingMove(payload);
    setSelectedCard(undefined);
    setSelectedTiki(undefined);
  };

  if (!roomId || !profile) return null;

  const isMyTurn = boardState?.currentPlayerId === profile.id;
  const myHand = boardState?.players[profile.id]?.hand || [];

  return (
    <div className="page-container">
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0 }}>Room: {roomId}</h2>
        {boardState && (
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: isMyTurn ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
            Turn: {boardState.currentPlayerId} {isMyTurn && '(You)'}
          </div>
        )}
      </div>

      {/* Waiting Room Phase */}
      {!boardState && roomJoinedData && (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
          <Clock size={48} color="var(--accent-secondary)" style={{ marginBottom: '1rem' }} />
          <h3>Waiting for Players</h3>
          <p style={{ margin: '1rem 0', color: 'var(--text-secondary)' }}>
            {roomJoinedData.playerCount} player(s) joined
          </p>
          <button 
            className="glass-button primary" 
            onClick={handleStartGame} 
            disabled={!roomJoinedData.canStart}
            style={{ width: '100%', marginTop: '1rem' }}
          >
            Start Game
          </button>
          {!roomJoinedData.canStart && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
              Minimum 2 players required.
            </p>
          )}
        </div>
      )}

      {/* Active Game Phase */}
      {boardState && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', flex: 1 }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Board Area */}
            <div className="glass-panel" style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
               {boardState.gameComplete && (
                  <div style={{ textAlign:'center', backgroundColor: 'var(--accent-primary)', color: '#000', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', fontWeight: 'bold' }}>
                    Game Complete! Winner: {Object.keys(boardState.scores).reduce((a, b) => boardState.scores[a] > boardState.scores[b] ? a : b)}
                  </div>
               )}
               {boardState.roundComplete && !boardState.gameComplete && (
                  <div style={{ textAlign:'center', backgroundColor: 'var(--accent-secondary)', color: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div>Round {boardState.roundNumber} Complete!</div>
                    <button 
                      className="glass-button" 
                      onClick={handleStartGame}
                      style={{ background: 'white', color: 'black', padding: '0.5rem 2rem' }}
                    >
                      Start Round {boardState.roundNumber + 1}
                    </button>
                  </div>
               )}

              <TotemStack 
                stack={boardState.totemStack} 
                eliminated={boardState.eliminatedTotems}
                selectedTiki={selectedTiki}
                onSelectTiki={setSelectedTiki}
                selectable={isMyTurn && !pendingMove}
              />
            </div>

            {/* Hand & Actions */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Your Hand</h3>
                <button 
                  className="glass-button primary" 
                  onClick={handlePlayCard}
                  disabled={!isMyTurn || !!pendingMove || !selectedCard || (selectedCard !== 'TIKI_TOAST' && selectedTiki === undefined)}
                >
                  {pendingMove ? 'Playing...' : 'Play Card'}
                </button>
              </div>
              <PlayerHand 
                hand={myHand} 
                selectedCard={selectedCard}
                onSelectCard={setSelectedCard}
                disabled={!isMyTurn || !!pendingMove}
                cardsPlayedCount={boardState.cardsPlayedCount}
              />
            </div>
          </div>

          <div>
             <PlayerInfo boardState={boardState} myUserId={profile.id} myUsername={profile.username} />
          </div>
        </div>
      )}

      {/* Error Toasts */}
      {errorEventMessage && (
        <div className="toast-container">
          <div className="toast" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={20} />
            {errorEventMessage}
          </div>
        </div>
      )}
    </div>
  );
};
