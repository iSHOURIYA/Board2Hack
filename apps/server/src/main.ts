import "dotenv/config";
import cors from "cors";
import express from "express";
import http from "node:http";
import type { AdvantageMappingConfig, MovePayload } from "@unfair-board/shared-types";
import { z } from "zod";
import {
  applyMove,
  createMatch,
  getMatch,
  getActiveAdvantageMapping,
  joinMatch,
  listAdvantageMappings,
  proposeConversion,
  setActiveAdvantageMapping,
  voteConversion
} from "./modules/match-store";
import { createSocketServer } from "./socket/index";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  ADMIN_API_TOKEN: z.string().default("dev-admin-token")
});

const env = envSchema.parse(process.env);
const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const token = req.header("x-admin-token");
  if (token !== env.ADMIN_API_TOKEN) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "unfair-board-server", timestamp: new Date().toISOString() });
});

app.post("/matches", (req, res) => {
  const playerName = String(req.body?.playerName ?? "Player 1").slice(0, 24);
  const result = createMatch(playerName || "Player 1");
  res.status(201).json(result);
});

app.post("/matches/:roomCode/join", (req, res) => {
  try {
    const roomCode = req.params.roomCode.toUpperCase();
    const playerName = String(req.body?.playerName ?? "Player 2").slice(0, 24);
    const result = joinMatch(roomCode, playerName || "Player 2");
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.get("/matches/:roomCode", (req, res) => {
  const roomCode = req.params.roomCode.toUpperCase();
  const match = getMatch(roomCode);

  if (!match) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  res.json({ match });
});

const server = http.createServer(app);
const io = createSocketServer(server, env.CORS_ORIGIN);

app.post("/matches/:roomCode/move", (req, res) => {
  try {
    const roomCode = req.params.roomCode.toUpperCase();
    const playerId = String(req.body?.playerId ?? "");
    const payload = req.body?.payload as MovePayload;
    const match = applyMove(roomCode, playerId, payload);
    io.to(roomCode).emit("match:state", match);
    res.json({ match });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.post("/matches/:roomCode/conversion/propose", (req, res) => {
  try {
    const roomCode = req.params.roomCode.toUpperCase();
    const playerId = String(req.body?.playerId ?? "");
    const targetGame = req.body?.targetGame;
    const match = proposeConversion({ roomCode, playerId, targetGame });

    if (match.conversionProposal) {
      io.to(roomCode).emit("conversion:proposal", match.conversionProposal);
      io.to(roomCode).emit("match:state", match);
    }

    res.json({
      match,
      mappingVersion: getActiveAdvantageMapping().version
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.get("/admin/advantage-mappings", requireAdmin, (_req, res) => {
  res.json({
    active: getActiveAdvantageMapping(),
    history: listAdvantageMappings()
  });
});

app.post("/admin/advantage-mappings", requireAdmin, (req, res) => {
  try {
    const input = req.body as AdvantageMappingConfig;
    const saved = setActiveAdvantageMapping(input);
    res.status(201).json({ mapping: saved });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.post("/matches/:roomCode/conversion/vote", (req, res) => {
  try {
    const roomCode = req.params.roomCode.toUpperCase();
    const playerId = String(req.body?.playerId ?? "");
    const proposalId = String(req.body?.proposalId ?? "");
    const accept = Boolean(req.body?.accept);

    const match = voteConversion({ roomCode, playerId, proposalId, accept });

    if (match.conversionProposal) {
      io.to(roomCode).emit("conversion:proposal", match.conversionProposal);
    } else {
      io.to(roomCode).emit("conversion:completed", match);
    }

    io.to(roomCode).emit("match:state", match);
    res.json({ match });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

server.listen(env.PORT, () => {
  console.log(`Unfair Board server listening on ${env.PORT}`);
});
