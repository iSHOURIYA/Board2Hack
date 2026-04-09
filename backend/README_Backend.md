# Tiki Topple Backend

Production-oriented backend for an online multiplayer version of Tiki Topple.

## Stack

- Fastify for HTTP APIs
- Socket.IO for real-time gameplay
- Prisma + PostgreSQL for persistence
- Redis for matchmaking and ephemeral runtime state
- Zod for request validation
- JWT for authentication

## Run Locally

1. Install dependencies.
2. Copy `.env.example` to `.env` and fill in real values.
3. Run Prisma generate and migrations.
4. Start the dev server.

```bash
npm ci
cp .env.example .env
npm run prisma:generate
npx prisma migrate dev
npm run dev
```

## Scripts

- `npm run dev` - start in watch mode
- `npm run build` - compile TypeScript
- `npm run start` - run compiled server
- `npm run test` - run unit tests
- `npm run prisma:generate` - generate Prisma client
- `npm run prisma:migrate` - create and apply local migrations

## API Docs

The frontend-facing contract is documented in [docs/frontend-contract.md](docs/frontend-contract.md).

## Health Check

- `GET /health` returns database and Redis connectivity status.

## Notes

- The backend is authoritative for game rules.
- Clients must treat server state as the source of truth.
- See the frontend contract doc for request/response shapes and socket events.
