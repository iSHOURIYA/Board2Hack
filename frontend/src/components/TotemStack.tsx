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
    <div className="totem-scene">
      {/* Eliminated Stack */}
      {eliminated.length > 0 && (
        <div className="eliminated-lane">
          <h4 className="eliminated-title">Eliminated</h4>
          {eliminated.map(id => (
            <TikiBlock key={`elim-${id}`} id={id} />
          ))}
        </div>
      )}

      {/* Main Stack */}
      <div className="totem-track-wrap">
         <div className="track-temple-cap" />
         <div className="track-wood-column" />
         {/* Top 3 Highlighting */}
         <div className="scoring-zone-glow" />
         <div className="scoring-zone-label">Scoring Zone</div>
         
        {stack.map((id) => (
          <div key={id} className="totem-stack-item">
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
      className={`tiki-stone ${selected ? 'selected' : ''} ${selectable ? 'selectable' : ''}`}
      style={{
        backgroundColor: colorVar,
        backgroundImage: `url('${bgImage}')`,
      }}
    >
      <span className="tiki-stone-number">{id}</span>
    </div>
  )
}
