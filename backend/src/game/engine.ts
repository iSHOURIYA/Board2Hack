import type { CardType, GameState, MoveResult, PlayCardInput, SecretTikiCard } from "../types/game";

const BASE_DECK: CardType[] = [
  "TIKI_UP_1",
  "TIKI_UP_1",
  "TIKI_UP_2",
  "TIKI_UP_2",
  "TIKI_UP_3",
  "TIKI_TOPPLE",
  "TIKI_TOAST"
];

const shuffle = <T>(arr: T[]): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const nextPlayer = (state: GameState): string => {
  const idx = state.playerOrder.indexOf(state.currentPlayerId);
  return state.playerOrder[(idx + 1) % state.playerOrder.length];
};

const ensurePlayerTurn = (state: GameState, playerId: string): void => {
  if (state.currentPlayerId !== playerId) {
    throw new Error("Not your turn.");
  }
};

const removeCardFromHand = (state: GameState, playerId: string, card: CardType): void => {
  const hand = state.players[playerId]?.hand;
  if (!hand) {
    throw new Error("Player not found in game state.");
  }

  const idx = hand.indexOf(card);
  if (idx === -1) {
    throw new Error("Card is not in hand.");
  }

  hand.splice(idx, 1);
};

const moveUpBy = (state: GameState, targetTikiId: number, spaces: number): void => {
  const from = state.totemStack.indexOf(targetTikiId);
  if (from === -1) {
    throw new Error("Target tiki is not active.");
  }

  const to = from - spaces;
  if (to < 0) {
    throw new Error("Tiki cannot move up full distance.");
  }

  state.totemStack.splice(from, 1);
  state.totemStack.splice(to, 0, targetTikiId);
};

const topple = (state: GameState, targetTikiId: number): void => {
  const from = state.totemStack.indexOf(targetTikiId);
  if (from === -1) {
    throw new Error("Target tiki is not active.");
  }

  state.totemStack.splice(from, 1);
  state.totemStack.push(targetTikiId);
};

const toastBottom = (state: GameState): number => {
  if (state.cardsPlayedCount === 0) {
    throw new Error("TIKI_TOAST cannot be played as the first move of a round.");
  }

  if (state.totemStack.length === 0) {
    throw new Error("No tiki available to remove.");
  }

  const removed = state.totemStack.pop();
  if (removed === undefined) {
    throw new Error("Failed to remove bottom tiki.");
  }

  state.eliminatedTotems.push(removed);
  return removed;
};

export const calculateRoundScore = (stack: number[], secret: SecretTikiCard): number => {
  let score = 0;
  if (stack[0] === secret.top) {
    score += 9;
  }

  if (stack.slice(0, 2).includes(secret.middle)) {
    score += 5;
  }

  if (stack.slice(0, 3).includes(secret.bottom)) {
    score += 2;
  }

  return score;
};

const hasCardsLeft = (state: GameState): boolean => {
  return Object.values(state.players).some((player) => player.hand.length > 0);
};

const finalizeRound = (state: GameState): void => {
  for (const playerId of state.playerOrder) {
    const roundScore = calculateRoundScore(state.totemStack, state.players[playerId].secret);
    state.scores[playerId] = (state.scores[playerId] ?? 0) + roundScore;
  }

  state.roundComplete = true;
};

const shouldEndRound = (state: GameState): boolean => {
  return state.totemStack.length <= 3 || !hasCardsLeft(state);
};

export const createInitialState = (roomId: string, playerIds: string[]): GameState => {
  if (playerIds.length < 2 || playerIds.length > 4) {
    throw new Error("Tiki Topple requires 2 to 4 players.");
  }

  const totems = shuffle(Array.from({ length: 9 }, (_, idx) => idx + 1));
  const players: GameState["players"] = {};

  for (const playerId of playerIds) {
    const secretPool = shuffle([...totems]);
    const secret: SecretTikiCard = {
      top: secretPool[0],
      middle: secretPool[1],
      bottom: secretPool[2]
    };

    const deck = playerIds.length === 2 ? [...BASE_DECK] : BASE_DECK.filter((c, i) => !(c === "TIKI_UP_1" && i === 0));

    players[playerId] = {
      playerId,
      secret,
      hand: shuffle(deck)
    };
  }

  const scores = playerIds.reduce<Record<string, number>>((acc, id) => {
    acc[id] = 0;
    return acc;
  }, {});

  return {
    roomId,
    roundNumber: 1,
    currentPlayerId: playerIds[0],
    playerOrder: [...playerIds],
    players,
    totemStack: totems,
    eliminatedTotems: [],
    cardsPlayedCount: 0,
    turnNumber: 1,
    scores,
    roundComplete: false,
    gameComplete: false,
    maxRounds: playerIds.length === 2 ? 4 : playerIds.length
  };
};

export const playCard = (state: GameState, input: PlayCardInput): MoveResult => {
  if (state.roundComplete || state.gameComplete) {
    throw new Error("Round is already complete.");
  }

  ensurePlayerTurn(state, input.playerId);
  removeCardFromHand(state, input.playerId, input.card);

  let removedTikiId: number | undefined;

  switch (input.card) {
    case "TIKI_UP_1":
      if (input.targetTikiId === undefined) throw new Error("Target tiki is required.");
      moveUpBy(state, input.targetTikiId, 1);
      break;
    case "TIKI_UP_2":
      if (input.targetTikiId === undefined) throw new Error("Target tiki is required.");
      moveUpBy(state, input.targetTikiId, 2);
      break;
    case "TIKI_UP_3":
      if (input.targetTikiId === undefined) throw new Error("Target tiki is required.");
      moveUpBy(state, input.targetTikiId, 3);
      break;
    case "TIKI_TOPPLE":
      if (input.targetTikiId === undefined) throw new Error("Target tiki is required.");
      topple(state, input.targetTikiId);
      break;
    case "TIKI_TOAST":
      removedTikiId = toastBottom(state);
      break;
    default:
      throw new Error("Unsupported card.");
  }

  state.cardsPlayedCount += 1;

  if (shouldEndRound(state)) {
    finalizeRound(state);
  } else {
    state.currentPlayerId = nextPlayer(state);
    state.turnNumber += 1;
  }

  return { state, removedTikiId };
};
