# Implementation Plan (Active)

## Current baseline completed

- Monorepo scaffold (`apps/*`, `packages/*`)
- Shared match and conversion types
- Chess -> Ludo conversion mapping
- Chess -> Snake & Ladder conversion mapping
- Express + Socket.IO backend with room flow
- React frontend shell with conversion proposal/vote controls
- PM2 + Nginx deployment templates

## In progress next

1. Replace demo chess move with legal move validation
2. Add dedicated UI board components:
   - Chess board
   - Ludo board
   - Snake & Ladder board
3. Add conversion preview UI (tier and resulting perks)
4. Add persistence adapters (Redis/Postgres)
5. Add integration and E2E tests

## Non-goals for v1

- Reverse conversion (Ludo/Snake -> Chess)
- Monopoly/Crossword gameplay
- Full account auth and ranking
