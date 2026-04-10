import React, { useEffect, useMemo, useState } from 'react';
import type { BoardState } from '../types/socket';
import { User, Trophy, Star } from 'lucide-react';

interface Props {
  boardState: BoardState;
  myUserId: string;
  myUsername: string;
}

export const PlayerInfo: React.FC<Props> = ({ boardState, myUserId, myUsername }) => {
  const [animatedScores, setAnimatedScores] = useState<Record<string, number>>({});

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setAnimatedScores((prev) => {
        const next: Record<string, number> = { ...prev };
        for (const [id, score] of Object.entries(boardState.scores)) {
          const current = next[id] ?? score;
          if (current < score) {
            next[id] = Math.min(score, current + 1);
          } else {
            next[id] = score;
          }
        }
        return next;
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [boardState.scores]);

  const trackMaxScore = Math.max(35, ...Object.values(boardState.scores));
  const trackSlots = Array.from({ length: trackMaxScore + 1 }, (_, i) => i);

  const resolvePlayerName = (playerId: string) => {
    if (playerId === myUserId) return `${myUsername} (You)`;
    const metadataName = boardState.playerMetadata?.[playerId]?.username || boardState.playerMetadata?.[playerId]?.name;
    return (
      boardState.usernames?.[playerId] ||
      boardState.playerNames?.[playerId] ||
      boardState.playerUsernames?.[playerId] ||
      metadataName ||
      boardState.players[playerId]?.username ||
      `Player ${playerId.substring(Math.max(0, playerId.length - 4))}`
    );
  };

  const tokenColors = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];
  const scoresByPlayer = useMemo(() => {
    const mapped: Record<string, number> = {};
    for (const playerId of boardState.playerOrder) {
      mapped[playerId] = animatedScores[playerId] ?? boardState.scores[playerId] ?? 0;
    }
    return mapped;
  }, [animatedScores, boardState.playerOrder, boardState.scores]);

  const scoreToAngle = (score: number) => {
    const normalized = Math.min(Math.max(score, 0), trackMaxScore) / trackMaxScore;
    return -90 + normalized * 360;
  };

  const slotCounts = new Map<number, number>();

  const getTokenOffset = (score: number) => {
    const count = slotCounts.get(score) || 0;
    slotCounts.set(score, count + 1);
    const spread = 8;
    if (count === 0) return { x: 0, y: 0 };
    if (count === 1) return { x: spread, y: 0 };
    if (count === 2) return { x: -spread, y: 0 };
    return { x: 0, y: spread };
  };

  return (
    <div className="glass-panel player-panel" style={{ padding: '1.5rem', height: '100%' }}>
      <h3 className="player-panel-heading" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Trophy size={20} color="var(--accent-primary)" /> Scores
      </h3>

      <div className="score-track" aria-label="Score track board">
        <div className="score-track-ring" />
        {trackSlots.map((slot) => {
          const angle = scoreToAngle(slot);
          const radians = (angle * Math.PI) / 180;
          const radius = 122;
          const x = Math.cos(radians) * radius;
          const y = Math.sin(radians) * radius;
          const isMajor = slot % 5 === 0;

          return (
            <div
              key={`slot-${slot}`}
              className={`score-stone ${isMajor ? 'major' : ''}`}
              style={{
                transform: `translate(${x}px, ${y}px)`
              }}
              title={`Score ${slot}`}
            >
              {slot}
            </div>
          );
        })}

        {boardState.playerOrder.map((playerId, index) => {
          const score = Math.min(Math.max(boardState.scores[playerId] || 0, 0), trackMaxScore);
          const angle = scoreToAngle(score);
          const radians = (angle * Math.PI) / 180;
          const radius = 122;
          const offset = getTokenOffset(score);
          const x = Math.cos(radians) * radius + offset.x;
          const y = Math.sin(radians) * radius + offset.y;

          return (
            <div
              key={`token-${playerId}`}
              className="score-token"
              style={{
                transform: `translate(${x}px, ${y}px)`,
                background: tokenColors[index % tokenColors.length],
                boxShadow: `0 0 0 2px rgba(22,15,11,0.8), 0 0 0 4px ${tokenColors[index % tokenColors.length]}55`
              }}
              title={`${resolvePlayerName(playerId)}: ${score} pts`}
            />
          );
        })}

        <div className="score-track-center">TIKI TRACK</div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {boardState.playerOrder.map((playerId) => {
          const isCurrentTurn = boardState.currentPlayerId === playerId;
          const isMe = myUserId === playerId;
          const score = scoresByPlayer[playerId] || 0;
          
          return (
            <div
              key={playerId} 
              className={`player-row ${isCurrentTurn ? 'current-turn' : ''}`}
            >
              <div className="player-row-left">
                <User size={18} color={isCurrentTurn ? 'var(--accent-primary)' : 'var(--text-secondary)'} />
                <span title={playerId} className={`player-row-name ${isMe ? 'is-me' : ''}`}>
                  {resolvePlayerName(playerId)}
                </span>
              </div>
              
              <div className="player-row-score">
                {score} pts
              </div>
            </div>
          );
        })}
      </div>

      {boardState.players[myUserId]?.secret && (
        <div className="secret-agenda-wrap" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--glass-border)' }}>
          <h4 className="secret-agenda-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            <Star size={16} /> Your Secret Agenda
          </h4>
          <div className="secret-agenda-cards" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            <div className="secret-chip" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Top (9 pts)</div>
              <div className="secret-chip-value" style={{ background: `var(--tiki-${boardState.players[myUserId].secret!.top})`, width: '40px', height: '40px', borderRadius: '4px', display: 'grid', placeItems: 'center', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                {boardState.players[myUserId].secret!.top}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>if 1st</div>
            </div>
            <div className="secret-chip" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Mid (5 pts)</div>
              <div className="secret-chip-value" style={{ background: `var(--tiki-${boardState.players[myUserId].secret!.middle})`, width: '40px', height: '40px', borderRadius: '4px', display: 'grid', placeItems: 'center', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                {boardState.players[myUserId].secret!.middle}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>if 1st-2nd</div>
            </div>
            <div className="secret-chip" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Bot (2 pts)</div>
              <div className="secret-chip-value" style={{ background: `var(--tiki-${boardState.players[myUserId].secret!.bottom})`, width: '40px', height: '40px', borderRadius: '4px', display: 'grid', placeItems: 'center', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
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
