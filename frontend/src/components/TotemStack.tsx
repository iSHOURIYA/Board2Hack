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

const TIKI_IMAGES: Record<number, string> = {
  1: 'https://images.squarespace-cdn.com/content/v1/53903e14e4b05bdda22359ca/1534980436895-N1FIO5KGSHSM125TXE7D/tikitopple-02.jpg',
  2: 'https://images.squarespace-cdn.com/content/v1/53903e14e4b05bdda22359ca/1534980437068-ZLU6G3D2BPWEQ5IH83J4/tikitopple-03.jpg',
  3: 'https://images.squarespace-cdn.com/content/v1/53903e14e4b05bdda22359ca/1534980434838-U46YB2UQOUHCFLHJ6ZVY/tikitopple-04.jpg',
  4: 'https://images.squarespace-cdn.com/content/v1/53903e14e4b05bdda22359ca/1534980434876-676RAEOQ28KIA1EYHSAK/tikitopple-05.jpg',
  5: 'https://images.squarespace-cdn.com/content/v1/53903e14e4b05bdda22359ca/1534980433872-SE4MUCAP6AEV7NZPM6JU/tikitopple-06.jpg',
  6: 'https://images.squarespace-cdn.com/content/v1/53903e14e4b05bdda22359ca/1534982277023-S9QA2UQONMBYZXSO3TDB/tikitopple-07.jpg',
  7: 'https://images.squarespace-cdn.com/content/v1/53903e14e4b05bdda22359ca/1534982275829-GVPLE58PH85MP5UR8W99/tikitopple-08.jpg',
  8: 'https://images.squarespace-cdn.com/content/v1/53903e14e4b05bdda22359ca/1534982274857-CFEDBMPI9NGVGZJMXXHP/tikitopple-09.jpg',
  9: 'https://images.squarespace-cdn.com/content/v1/53903e14e4b05bdda22359ca/1534980434876-676RAEOQ28KIA1EYHSAK/tikitopple-05.jpg'
};

const TikiBlock: React.FC<{ id: TikiId, selected?: boolean, selectable?: boolean, onClick?: () => void }> = ({ id, selected, selectable, onClick }) => {
  const colorVar = `var(--tiki-${Math.min(id, 9)})`; // Map id to 1-9 fallback
  const bgImage = TIKI_IMAGES[Math.min(id, 9)];

  return (
    <div 
      onClick={onClick}
      style={{
        width: '180px',
        height: '65px',
        backgroundColor: colorVar,
        backgroundImage: `url('${bgImage}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundBlendMode: 'overlay',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '900',
        fontSize: '1.4rem',
        textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.5)',
        boxShadow: selected 
          ? `0 0 0 4px var(--bg-dark), 0 0 0 8px ${colorVar}, inset 0 0 20px rgba(0,0,0,0.6), 0 15px 35px rgba(0,0,0,0.7)` 
          : 'inset 0 0 15px rgba(0,0,0,0.5), 0 6px 12px rgba(0,0,0,0.4)',
        transform: selected ? 'scale(1.05) translateY(-5px)' : 'scale(1)',
        cursor: selectable ? 'pointer' : 'default',
        transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        border: '3px solid rgba(255,255,255,0.3)',
        color: '#fff',
        letterSpacing: '1px'
      }}
    >
      TIKI {id}
    </div>
  )
}
