import React from 'react';
import type { CardId } from '../types/game';

interface Props {
  hand: CardId[];
  onSelectCard: (card: CardId) => void;
  selectedCard?: CardId;
  disabled: boolean;
}

export const PlayerHand: React.FC<Props> = ({ hand, onSelectCard, selectedCard, disabled }) => {
  return (
    <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
      {hand.map((card, idx) => (
        <CardItem 
          key={`${card}-${idx}`} 
          card={card} 
          selected={selectedCard === card}
          disabled={disabled}
          onClick={() => !disabled && onSelectCard(card)}
        />
      ))}
      {hand.length === 0 && (
         <div style={{ padding: '2rem', textAlign: 'center', width: '100%', color: 'var(--text-secondary)' }}>
           No cards left
         </div>
      )}
    </div>
  );
};

const CardItem: React.FC<{ card: CardId, selected: boolean, disabled: boolean, onClick: () => void }> = ({ card, selected, disabled, onClick }) => {
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
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transform: selected ? 'translateY(-10px)' : 'translateY(0)',
        transition: 'all 0.2s ease',
        boxShadow: selected ? '0 8px 16px rgba(0,0,0,0.4)' : 'none',
        fontWeight: 600,
        fontSize: '1.1rem',
      }}
    >
      {card.replace(/_/g, ' ')}
    </div>
  )
}
