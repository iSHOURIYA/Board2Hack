import type {
  AdvantageMappingConfig,
  ConversionVoteRequest,
  MatchState,
  MovePayload,
  PlayerState,
  ProposeConversionRequest
} from "@unfair-board/shared-types";
import {
  DEFAULT_ADVANTAGE_MAPPING,
  applyMove as applyEngineMove,
  convertFromChess
} from "@unfair-board/game-engine";

const matches = new Map<string, MatchState>();
const mappingHistory: AdvantageMappingConfig[] = [DEFAULT_ADVANTAGE_MAPPING];
let activeMapping: AdvantageMappingConfig = DEFAULT_ADVANTAGE_MAPPING;

function randomRoomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function assertPlayerInMatch(match: MatchState, playerId: string): PlayerState {
  const player = match.players.find((p) => p.id === playerId);
  if (!player) {
    throw new Error("Player not in room");
  }

  return player;
}

function seedChessMatch(roomCode: string, player: PlayerState): MatchState {
  return {
    roomCode,
    players: [player],
    status: "waiting",
    version: 1,
    conversionHistory: [],
    gameState: {
      gameType: "chess",
      chess: {
        fen: "rn1qkbnr/pppb1ppp/3p4/4p3/3PP3/3B1N2/PPP2PPP/RNBQK2R w KQkq - 0 1",
        moveCount: 0,
        currentTurn: "white",
        inCheck: false,
        moves: []
      }
    }
  };
}

export function createMatch(playerName: string): { roomCode: string; playerId: string; match: MatchState } {
  const roomCode = randomRoomCode();
  const playerId = crypto.randomUUID();

  const player: PlayerState = {
    id: playerId,
    name: playerName,
    side: "white",
    connected: true
  };

  const match = seedChessMatch(roomCode, player);
  matches.set(roomCode, match);
  return { roomCode, playerId, match };
}

export function getMatch(roomCode: string): MatchState | undefined {
  return matches.get(roomCode);
}

export function joinMatch(roomCode: string, playerName: string): { playerId: string; match: MatchState } {
  const match = matches.get(roomCode);
  if (!match) {
    throw new Error("Room does not exist");
  }

  if (match.players.length >= 2) {
    throw new Error("Room is full");
  }

  const playerId = crypto.randomUUID();
  const player: PlayerState = {
    id: playerId,
    name: playerName,
    side: "black",
    connected: true
  };

  const updated: MatchState = {
    ...match,
    players: [...match.players, player],
    status: "active",
    version: match.version + 1
  };

  matches.set(roomCode, updated);
  return { playerId, match: updated };
}

export function applyMove(roomCode: string, playerId: string, payload: MovePayload): MatchState {
  const match = matches.get(roomCode);
  if (!match) {
    throw new Error("Room does not exist");
  }

  assertPlayerInMatch(match, playerId);
  const updated = applyEngineMove(match, playerId, payload);
  matches.set(roomCode, updated);
  return updated;
}

export function proposeConversion(payload: ProposeConversionRequest): MatchState {
  const match = matches.get(payload.roomCode);
  if (!match) {
    throw new Error("Room does not exist");
  }

  if (match.gameState.gameType !== "chess") {
    throw new Error("V1 supports conversion only from chess");
  }

  assertPlayerInMatch(match, payload.playerId);

  const proposal = {
    id: crypto.randomUUID(),
    requestedByPlayerId: payload.playerId,
    targetGame: payload.targetGame,
    acceptedByPlayerIds: [payload.playerId],
    status: "pending" as const,
    createdAt: new Date().toISOString()
  };

  const updated: MatchState = {
    ...match,
    version: match.version + 1,
    conversionProposal: proposal
  };

  matches.set(payload.roomCode, updated);
  return updated;
}

export function voteConversion(payload: ConversionVoteRequest): MatchState {
  const match = matches.get(payload.roomCode);
  if (!match) {
    throw new Error("Room does not exist");
  }

  assertPlayerInMatch(match, payload.playerId);

  const proposal = match.conversionProposal;
  if (!proposal || proposal.id !== payload.proposalId) {
    throw new Error("Proposal not found");
  }

  if (!payload.accept) {
    const updated = {
      ...match,
      version: match.version + 1,
      conversionProposal: undefined
    };
    matches.set(payload.roomCode, updated);
    return updated;
  }

  const accepted = Array.from(new Set([...proposal.acceptedByPlayerIds, payload.playerId]));

  if (accepted.length < 2) {
    const updated = {
      ...match,
      version: match.version + 1,
      conversionProposal: {
        ...proposal,
        acceptedByPlayerIds: accepted
      }
    };

    matches.set(payload.roomCode, updated);
    return updated;
  }

  const converted = convertFromChess(match, proposal.targetGame, activeMapping);
  matches.set(payload.roomCode, converted);
  return converted;
}

export function getActiveAdvantageMapping(): AdvantageMappingConfig {
  return activeMapping;
}

export function listAdvantageMappings(): AdvantageMappingConfig[] {
  return mappingHistory;
}

export function setActiveAdvantageMapping(input: AdvantageMappingConfig): AdvantageMappingConfig {
  const normalized: AdvantageMappingConfig = {
    ...input,
    updatedAt: new Date().toISOString()
  };

  activeMapping = normalized;
  mappingHistory.unshift(normalized);
  return normalized;
}
