import React, { useEffect, useState } from 'react';
import { useRoute } from 'wouter';
import { socketService } from '../services/socket';
import { useGameStore } from '../store/useGameStore';
import { useAuthStore } from '../store/useAuthStore';
import type { CardId, TikiId } from '../types/game';
import type { BoardState, RoomJoinedPayload, ErrorEventPayload } from '../types/socket';
import { TotemStack } from '../components/TotemStack';
import { PlayerHand } from '../components/PlayerHand';
import { PlayerInfo } from '../components/PlayerInfo';
import { AlertCircle, Clock, Volume2, VolumeX } from 'lucide-react';
import { useSound } from '../hooks/useSound';

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
  const [boardTilt, setBoardTilt] = useState({ x: 0, y: 0 });
  const { enabled: soundEnabled, toggle: toggleSound, play, ambient } = useSound();

  useEffect(() => {
    ambient.start();
    return () => {
      ambient.stop();
    };
  }, [ambient]);

  useEffect(() => {
    const hasEliminated = (boardState?.eliminatedTotems.length || 0) > 0;
    if (hasEliminated) {
      play('eliminated');
      return;
    }
    if (selectedCard === 'TIKI_TOPPLE') {
      play('topple');
      return;
    }
    if (selectedCard) {
      play('stoneShift');
    }
  }, [boardState?.eliminatedTotems.length, selectedCard, play]);

  useEffect(() => {
    if (!selectedCard) return;
    play('cardSelect');
  }, [selectedCard, play]);

  useEffect(() => {
    if (pendingMove) {
      play('cardPlay');
    }
  }, [pendingMove, play]);

  useEffect(() => {
    if (boardState?.roundComplete || boardState?.gameComplete) {
      play('scoreUp');
    }
  }, [boardState?.roundComplete, boardState?.gameComplete, play]);

  useEffect(() => {
    if (!roomId) return;

    socketService.connect();

    const onRoomJoined = (payload: RoomJoinedPayload) => {
      setRoomJoinedData(payload);
    };

    const onStateUpdate = (payload: BoardState) => {
      setBoardState(payload);
    };

    const onErrorEvent = (payload: ErrorEventPayload) => {
      setErrorEvent(payload.message);
      // Auto-clear toast after 3s
      setTimeout(() => setErrorEvent(null), 3000);
    };

    socketService.onRoomJoined(onRoomJoined);
    socketService.onStateUpdate(onStateUpdate);
    socketService.onErrorEvent(onErrorEvent);

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
      socketService.offRoomJoined(onRoomJoined);
      socketService.offStateUpdate(onStateUpdate);
      socketService.offErrorEvent(onErrorEvent);
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

  const handleBoardMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 6;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * -6;
    setBoardTilt({ x, y });
  };

  const resetBoardTilt = () => {
    setBoardTilt({ x: 0, y: 0 });
  };

  if (!roomId || !profile) return null;

  const isMyTurn = boardState?.currentPlayerId === profile.id;
  const myHand = boardState?.players[profile.id]?.hand || [];
  const resolvePlayerName = (playerId: string) => {
    const metadataName = boardState?.playerMetadata?.[playerId]?.username || boardState?.playerMetadata?.[playerId]?.name;
    return (
      boardState?.usernames?.[playerId] ||
      boardState?.playerNames?.[playerId] ||
      boardState?.playerUsernames?.[playerId] ||
      metadataName ||
      boardState?.players[playerId]?.username ||
      playerId
    );
  };

  const currentPlayerLabel = boardState
    ? (boardState.currentPlayerId === profile.id
      ? `${profile.username} (You)`
      : resolvePlayerName(boardState.currentPlayerId))
    : '';

  return (
    <div className="page-container">
      {/* Header Info */}
      <div className="game-header-row">
        <h2 className="section-title" style={{ margin: 0 }}>Room: {roomId}</h2>
        <div className="game-header-right">
          {boardState && (
            <div className={`turn-indicator ${isMyTurn ? 'active' : ''}`}>
              Turn: {currentPlayerLabel}
            </div>
          )}
          <button className="glass-button" type="button" onClick={toggleSound} aria-label="Toggle game audio">
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />} {soundEnabled ? 'Sound On' : 'Sound Off'}
          </button>
        </div>
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
        <div className="game-shell">
          
          <div className="game-main">
            {/* Board Area */}
            <div
              className="glass-panel board-panel"
              style={{
                flex: 1,
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                transform: `perspective(1100px) rotateX(${boardTilt.y}deg) rotateY(${boardTilt.x}deg)`,
              }}
              onMouseMove={handleBoardMouseMove}
              onMouseLeave={resetBoardTilt}
            >
               {boardState.gameComplete && (
                  <div style={{ textAlign:'center', backgroundColor: 'var(--accent-primary)', color: '#000', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', fontWeight: 'bold' }}>
                    Game Complete! Winner: {Object.keys(boardState.scores).reduce((a, b) => boardState.scores[a] > boardState.scores[b] ? a : b)}
                  </div>
               )}
               {boardState.roundComplete && !boardState.gameComplete && (
                  <div style={{ textAlign:'center', backgroundColor: 'var(--accent-secondary)', color: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div>Round {boardState.roundNumber} Complete!</div>
                    <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                      Waiting for server to start the next round...
                    </div>
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
                <h3 className="section-title" style={{ margin: 0 }}>Your Hand</h3>
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
