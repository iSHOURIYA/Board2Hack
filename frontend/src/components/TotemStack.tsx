import React from 'react';
import type { TikiId } from '../types/game';

interface Props {
  stack: TikiId[];
  eliminated: TikiId[];
  onSelectTiki: (tiki: TikiId) => void;
  selectedTiki?: TikiId;
  selectable: boolean;
}

export const TotemStack: React.FC<Props> = ({ stack, eliminated, onSelectTiki, selectedTiki, selectable }) => {
  return (
    <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center' }}>
      {/* Eliminated Stack */}
      {eliminated.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'flex-end', opacity: 0.5, transform: 'scale(0.8)' }}>
          <h4 style={{ textAlign: 'center', color: 'var(--text-danger)', fontSize: '0.8rem' }}>Eliminated</h4>
          {eliminated.map(id => (
            <TikiBlock key={`elim-${id}`} id={id} />
          ))}
        </div>
      )}

      {/* Main Stack */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
         {/* Top 3 Highlighting */}
         <div style={{ position: 'absolute', top: '-10px', bottom: 'auto', left: '-20px', right: '-20px', height: 'calc((60px + 0.5rem) * 3 + 20px)', border: '2px dashed var(--accent-primary)', borderRadius: '12px', pointerEvents: 'none', zIndex: 0 }} />
         <div style={{ position: 'absolute', top: '-30px', width: '100%', textAlign: 'center', color: 'var(--accent-primary)', fontSize: '0.8rem', fontWeight: 'bold' }}>Scoring Zone</div>
         
        {stack.map((id) => (
          <div key={id} style={{ position: 'relative', zIndex: 1 }}>
            <TikiBlock 
              id={id} 
              selected={selectedTiki === id}
              selectable={selectable}
              onClick={() => selectable && onSelectTiki(id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const TikiBlock: React.FC<{ id: TikiId, selected?: boolean, selectable?: boolean, onClick?: () => void }> = ({ id, selected, selectable, onClick }) => {
  const colorVar = `var(--tiki-${Math.min(id, 9)})`; // Map id to 1-9 fallback

  return (
    <div 
      onClick={onClick}
      style={{
        width: '180px',
        height: '60px',
        backgroundColor: colorVar,
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: '1.2rem',
        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
        boxShadow: selected 
          ? `0 0 0 4px var(--bg-dark), 0 0 0 8px ${colorVar}, 0 10px 25px rgba(0,0,0,0.5)` 
          : '0 4px 6px rgba(0,0,0,0.3)',
        transform: selected ? 'scale(1.05)' : 'scale(1)',
        cursor: selectable ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        border: '1px solid rgba(255,255,255,0.2)',
        color: '#fff',
      }}
    >
      TIKI {id}
    </div>
  )
}
