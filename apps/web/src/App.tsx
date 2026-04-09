import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { ConversionProposal, MatchState } from "@unfair-board/shared-types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

type JoinState = {
  roomCode: string;
  playerId: string;
  playerName: string;
};

async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

function GameBadge({ match }: { match: MatchState | null }) {
  if (!match) {
    return <span className="badge">No active match</span>;
  }

  const label = match.gameState.gameType === "snake_ladder" ? "Snake & Ladder" : match.gameState.gameType;
  return <span className="badge">Live Game: {label}</span>;
}

export function App() {
  const [playerName, setPlayerName] = useState("Player");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [joinState, setJoinState] = useState<JoinState | null>(null);
  const [match, setMatch] = useState<MatchState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const socket: Socket | null = useMemo(() => {
    if (!joinState) return null;

    return io(API_BASE, {
      transports: ["websocket"]
    });
  }, [joinState]);

  useEffect(() => {
    if (!socket || !joinState) return;

    socket.emit("match:join", { roomCode: joinState.roomCode, playerId: joinState.playerId });
    socket.on("match:state", (nextMatch) => setMatch(nextMatch));
    socket.on("conversion:proposal", (proposal: ConversionProposal) => {
      setMatch((prev) => {
        if (!prev) return prev;
        return { ...prev, conversionProposal: proposal };
      });
    });
    socket.on("match:error", (message: string) => setError(message));

    return () => {
      socket.disconnect();
    };
  }, [socket, joinState]);

  async function createRoom() {
    setError(null);
    try {
      const result = await api<{ roomCode: string; playerId: string }>("/matches", "POST", { playerName });
      const state: JoinState = { roomCode: result.roomCode, playerId: result.playerId, playerName };
      setJoinState(state);
      setRoomCodeInput(result.roomCode);
      const current = await api<{ match: MatchState }>(`/matches/${result.roomCode}`);
      setMatch(current.match);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function joinRoom() {
    setError(null);
    const roomCode = roomCodeInput.trim().toUpperCase();
    if (!roomCode) return;

    try {
      const result = await api<{ playerId: string; match: MatchState }>(`/matches/${roomCode}/join`, "POST", {
        playerName
      });

      setJoinState({ roomCode, playerId: result.playerId, playerName });
      setMatch(result.match);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function playMove() {
    if (!joinState) return;

    try {
      await api(`/matches/${joinState.roomCode}/move`, "POST", {
        playerId: joinState.playerId,
        payload: {}
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function proposeConversion(targetGame: "ludo" | "snake_ladder") {
    if (!joinState) return;

    try {
      await api(`/matches/${joinState.roomCode}/conversion/propose`, "POST", {
        playerId: joinState.playerId,
        targetGame
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function voteConversion(accept: boolean) {
    if (!joinState || !match?.conversionProposal) return;

    try {
      await api(`/matches/${joinState.roomCode}/conversion/vote`, "POST", {
        playerId: joinState.playerId,
        proposalId: match.conversionProposal.id,
        accept
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">Unfair Board v1</p>
        <h1>Chess to Any</h1>
        <p className="lead">Start in Chess, switch to Ludo or Snake & Ladder when both players agree.</p>
      </section>

      <section className="card grid">
        <label>
          Name
          <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={24} />
        </label>

        <label>
          Room Code
          <input value={roomCodeInput} onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())} maxLength={6} />
        </label>

        <div className="actions">
          <button onClick={createRoom}>Create Room</button>
          <button onClick={joinRoom} className="ghost">
            Join Room
          </button>
        </div>
      </section>

      <section className="card">
        <div className="row">
          <GameBadge match={match} />
          {joinState ? <span className="room">Room: {joinState.roomCode}</span> : null}
        </div>

        {match ? (
          <>
            <p className="mono">Version: {match.version}</p>
            <p>
              Players: {match.players.map((p) => `${p.name} (${p.side})`).join(" vs ")}
            </p>
            <div className="actions wrap">
              <button onClick={playMove}>Play Turn (Demo Move)</button>
              <button onClick={() => proposeConversion("ludo")}>Propose Ludo</button>
              <button onClick={() => proposeConversion("snake_ladder")}>Propose Snake & Ladder</button>
            </div>

            {match.conversionProposal ? (
              <div className="proposal">
                <p>
                  Conversion Proposal: {match.conversionProposal.targetGame} by {match.conversionProposal.requestedByPlayerId}
                </p>
                <p>Accepted: {match.conversionProposal.acceptedByPlayerIds.length}/2</p>
                <div className="actions">
                  <button onClick={() => voteConversion(true)}>Accept</button>
                  <button className="danger" onClick={() => voteConversion(false)}>
                    Reject
                  </button>
                </div>
              </div>
            ) : null}

            <pre>{JSON.stringify(match.gameState, null, 2)}</pre>
          </>
        ) : (
          <p>Create or join a room to start.</p>
        )}

        {error ? <p className="error">{error}</p> : null}
      </section>
    </main>
  );
}
