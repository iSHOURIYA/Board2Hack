import React from 'react';
import type { BoardState } from '../types/socket';
import { User, Trophy, Star } from 'lucide-react';

interface Props {
  boardState: BoardState;
  myUserId: string;
  myUsername: string;
}

export const PlayerInfo: React.FC<Props> = ({ boardState, myUserId, myUsername }) => {
  return (
    <div className="glass-panel" style={{ padding: '1.5rem', height: '100%' }}>
      <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Trophy size={20} color="var(--accent-primary)" /> Scores
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {boardState.playerOrder.map((playerId) => {
          const isCurrentTurn = boardState.currentPlayerId === playerId;
          const isMe = myUserId === playerId;
          const score = boardState.scores[playerId] || 0;
          
          return (
            <div 
              key={playerId} 
              style={{ 
                padding: '1rem', 
                borderRadius: '8px',
                background: isCurrentTurn ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isCurrentTurn ? 'var(--accent-primary)' : 'transparent'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <User size={18} color={isCurrentTurn ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
                <span title={playerId} style={{ fontWeight: isMe ? 'bold' : 'normal', color: isCurrentTurn ? 'white' : 'var(--text-primary)' }}>
                  {isMe ? `${myUsername} (You)` : `Player ${playerId.substring(Math.max(0, playerId.length - 4))}`}
                </span>
              </div>
              
              <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--accent-secondary)' }}>
                {score} pts
              </div>
            </div>
          );
        })}
      </div>

      {boardState.players[myUserId]?.secret && (
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
          <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            <Star size={16} /> Your Secret Agenda
          </h4>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Top (9 pts)</div>
              <div style={{ background: `var(--tiki-${boardState.players[myUserId].secret!.top})`, width: '40px', height: '40px', borderRadius: '4px', display: 'grid', placeItems: 'center', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                {boardState.players[myUserId].secret!.top}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>if 1st</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Mid (5 pts)</div>
              <div style={{ background: `var(--tiki-${boardState.players[myUserId].secret!.middle})`, width: '40px', height: '40px', borderRadius: '4px', display: 'grid', placeItems: 'center', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                {boardState.players[myUserId].secret!.middle}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>if 1st-2nd</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Bot (2 pts)</div>
              <div style={{ background: `var(--tiki-${boardState.players[myUserId].secret!.bottom})`, width: '40px', height: '40px', borderRadius: '4px', display: 'grid', placeItems: 'center', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                {boardState.players[myUserId].secret!.bottom}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>if 1st-3rd</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
        Round {boardState.roundNumber} / {boardState.maxRounds}
      </div>
    </div>
  );
};
