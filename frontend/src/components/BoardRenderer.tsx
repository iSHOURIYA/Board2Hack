import React from 'react';
import type { BoardState } from '../types/socket';
import type { TikiId } from '../types/game';
import { TotemStack } from './TotemStack';

interface Props {
  boardState: BoardState;
  selectedTiki?: TikiId;
  onSelectTiki: (id: TikiId | undefined) => void;
  isMyTurn: boolean;
  hasPendingMove: boolean;
}

export const BoardRenderer: React.FC<Props> = ({
  boardState,
  selectedTiki,
  onSelectTiki,
  isMyTurn,
  hasPendingMove,
}) => {
  return (
    <div className="board-render-root">
      {boardState.gameComplete && (
        <div className="board-banner game-complete">
          Game Complete! Winner: {Object.keys(boardState.scores).reduce((a, b) => boardState.scores[a] > boardState.scores[b] ? a : b)}
        </div>
      )}
      {boardState.roundComplete && !boardState.gameComplete && (
        <div className="board-banner round-complete">
          <div>Round {boardState.roundNumber} Complete!</div>
          <div className="board-banner-subtext">Server preparing next round...</div>
        </div>
      )}
      <TotemStack
        stack={boardState.totemStack}
        eliminated={boardState.eliminatedTotems}
        selectedTiki={selectedTiki}
        onSelectTiki={(id) => onSelectTiki(selectedTiki === id ? undefined : id)}
        selectable={isMyTurn && !hasPendingMove}
      />
    </div>
  );
};
