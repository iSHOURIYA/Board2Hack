import React from 'react';
import type { CardId } from '../types/game';

interface Props {
  hand: CardId[];
  onSelectCard: (card: CardId) => void;
  selectedCard?: CardId;
  disabled: boolean;
  cardsPlayedCount: number;
  justPlayedCard?: CardId;
}

const cardDescriptions: Record<string, string> = {
  TIKI_UP_1: "Up 1 Space",
  TIKI_UP_2: "Up 2 Spaces",
  TIKI_UP_3: "Up 3 Spaces",
  TIKI_TOAST: "Eliminate Bot Tiki",
  TIKI_TOPPLE: "Send to Bottom",
};

const cardLabels: Record<CardId, string> = {
  TIKI_UP_1: 'Tiki Up +1',
  TIKI_UP_2: 'Tiki Up +2',
  TIKI_UP_3: 'Tiki Up +3',
  TIKI_TOPPLE: 'Tiki Topple',
  TIKI_TOAST: 'Tiki Toast'
};

const cardGlyph: Record<CardId, string> = {
  TIKI_UP_1: '▲',
  TIKI_UP_2: '▲▲',
  TIKI_UP_3: '▲▲▲',
  TIKI_TOPPLE: '↧',
  TIKI_TOAST: '🔥'
};

export const PlayerHand: React.FC<Props> = ({ hand, onSelectCard, selectedCard, disabled, cardsPlayedCount, justPlayedCard }) => {
  return (
    <div className="card-hand-shell">
      <div className="card-hand-scroll">
      {hand.map((card, idx) => {
        const isToastRestricted = card === 'TIKI_TOAST' && cardsPlayedCount === 0;
        const cardDisabled = disabled || isToastRestricted;
        const shouldPlayAnimate = justPlayedCard === card;
        
        return (
          <CardItem 
            key={`${card}-${idx}`} 
            card={card} 
            selected={selectedCard === card}
            disabled={cardDisabled}
            isToastRestricted={isToastRestricted}
            played={shouldPlayAnimate}
            onClick={() => !cardDisabled && onSelectCard(card)}
          />
        );
      })}
      </div>
      {hand.length === 0 && (
         <div className="empty-hand-note">
           No cards left
         </div>
      )}
    </div>
  );
};

const CardItem: React.FC<{ card: CardId, selected: boolean, disabled: boolean, isToastRestricted: boolean, played: boolean, onClick: () => void }> = ({ card, selected, disabled, isToastRestricted, played, onClick }) => {
  const cardClass = `tiki-card ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''} ${played ? 'played' : ''}`;
  return (
    <div 
      onClick={onClick}
      className={cardClass}
      title={isToastRestricted ? "Cannot be played as the first card of the round" : undefined}
    >
      <div className="tiki-card-grain" />
      <div className="tiki-card-icon">{cardGlyph[card]}</div>
      <div className="tiki-card-title">{cardLabels[card]}</div>
      <div className="tiki-card-effect">
        {cardDescriptions[card]}
      </div>
      {isToastRestricted && (
        <div className="tiki-card-rule-lock">
          Restricted Turn 1
        </div>
      )}
    </div>
  )
}
