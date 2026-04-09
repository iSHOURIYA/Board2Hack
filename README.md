# Unfair Board

Production-focused multiplayer foundation for **Chess -> Ludo/Snake & Ladder** conversion.

## V1 Scope

- Online multiplayer (2 players)
- Guest name + room code
- Match starts in Chess
- One-way conversion only:
  - Chess -> Ludo
  - Chess -> Snake & Ladder
- Conversion requires both players to accept
- REST + Socket.IO architecture

## Monorepo Structure

- `apps/server`: Express + Socket.IO backend
- `apps/web`: React + Vite frontend
- `packages/shared-types`: shared domain contracts
- `packages/game-engine`: conversion and game state logic
- `deploy/pm2`: PM2 production config
- `deploy/nginx`: Nginx reverse proxy sample

## Local Development

Requirements:

- Node.js 20+
- pnpm 10+

Install and run:

```bash
pnpm install
pnpm dev
```

By default:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

## Backend Endpoints (Current)

- `GET /health`
- `POST /matches` (create room)
- `POST /matches/:roomCode/join`
- `GET /matches/:roomCode`
- `POST /matches/:roomCode/move`
- `POST /matches/:roomCode/conversion/propose`
- `POST /matches/:roomCode/conversion/vote`

## Production Deployment (No Docker)

Backend VPS target:

1. Build server: `pnpm --filter @unfair-board/server build`
2. Configure env vars on server
3. Run with PM2 using `deploy/pm2/ecosystem.config.cjs`
4. Put Nginx config from `deploy/nginx/unfairboard.conf`
5. Add SSL with Certbot

Frontend deploy:

- Vercel or Netlify
- Set `VITE_API_BASE_URL` to your backend URL

## Next Implementation Targets

- Real chess move validation (current move endpoint is demo turn switch)
- Board rendering components for all 3 v1 games
- Redis + Postgres persistence
- Match recovery and reconnect sync hardening
