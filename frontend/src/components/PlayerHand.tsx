import React from 'react';
import type { CardId } from '../types/game';

interface Props {
  hand: CardId[];
  onSelectCard: (card: CardId) => void;
  selectedCard?: CardId;
  disabled: boolean;
  cardsPlayedCount: number;
}

const cardDescriptions: Record<string, string> = {
  TIKI_UP_1: "Up 1 Space",
  TIKI_UP_2: "Up 2 Spaces",
  TIKI_UP_3: "Up 3 Spaces",
  TIKI_TOAST: "Eliminate Bot Tiki",
  TIKI_TOPPLE: "Send to Bottom",
};

export const PlayerHand: React.FC<Props> = ({ hand, onSelectCard, selectedCard, disabled, cardsPlayedCount }) => {
  return (
    <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
      {hand.map((card, idx) => {
        const isToastRestricted = card === 'TIKI_TOAST' && cardsPlayedCount === 0;
        const cardDisabled = disabled || isToastRestricted;
        
        return (
          <CardItem 
            key={`${card}-${idx}`} 
            card={card} 
            selected={selectedCard === card}
            disabled={cardDisabled}
            isToastRestricted={isToastRestricted}
            onClick={() => !cardDisabled && onSelectCard(card)}
          />
        );
      })}
      {hand.length === 0 && (
         <div style={{ padding: '2rem', textAlign: 'center', width: '100%', color: 'var(--text-secondary)' }}>
           No cards left
         </div>
      )}
    </div>
  );
};

const CardItem: React.FC<{ card: CardId, selected: boolean, disabled: boolean, isToastRestricted: boolean, onClick: () => void }> = ({ card, selected, disabled, isToastRestricted, onClick }) => {
  return (
    <div 
      onClick={onClick}
      style={{
        minWidth: '120px',
        height: '160px',
        background: selected ? 'var(--bg-dark)' : 'var(--glass-bg)',
        border: `2px solid ${selected ? 'var(--accent-primary)' : 'var(--glass-border)'}`,
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transform: selected ? 'translateY(-10px)' : 'translateY(0)',
        transition: 'all 0.2s ease',
        boxShadow: selected ? '0 8px 16px rgba(0,0,0,0.4)' : 'none',
      }}
      title={isToastRestricted ? "Cannot be played as the first card of the round" : undefined}
    >
      <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
        {card.replace(/_/g, ' ')}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
        {cardDescriptions[card]}
      </div>
      {isToastRestricted && (
        <div style={{ fontSize: '0.65rem', color: 'var(--accent-secondary)', marginTop: '0.5rem', fontWeight: 'bold' }}>
          Restricted Turn 1
        </div>
      )}
    </div>
  )
}
