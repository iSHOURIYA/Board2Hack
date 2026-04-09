# Backend API Reference

This reference summarizes the currently implemented backend endpoints and runtime behavior.

## Base Paths

- REST: `/api/v1`
- Health: `/health`
- Socket.IO path: `/ws`

## Routes

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | No | Check DB and Redis connectivity |
| POST | `/api/v1/auth/register` | No | Create a user and return JWT |
| POST | `/api/v1/auth/login` | No | Authenticate and return JWT |
| GET | `/api/v1/profile` | Yes | Return current user profile |
| GET | `/api/v1/leaderboards` | No | Return top users by score |
| GET | `/api/v1/rooms` | No | List public waiting rooms |
| POST | `/api/v1/rooms` | Yes | Create a room |
| POST | `/api/v1/rooms/:roomId/join` | Yes | Join a room |
| POST | `/api/v1/matchmake` | Yes | Enqueue or create a quick match |

## Request Requirements

- For JSON POST requests, always send `Content-Type: application/json`.
- For protected routes, always send `Authorization: Bearer <jwt>`.
- Route validation is strict. Invalid body fields return `400`.

## Validation Matrix

### POST /api/v1/auth/register

- email: valid email string
- username: 3..32 chars
- password: min 8 chars

### POST /api/v1/auth/login

- identity: non-empty string
- password: min 8 chars

### POST /api/v1/rooms

- name: 2..80 chars
- maxPlayers: numeric 2..4
- isPrivate: boolean (optional)
- password: optional, if sent 4..128 chars
- region: optional, if sent 2..32 chars

### POST /api/v1/rooms/:roomId/join

- password: optional for public rooms
- password required for private rooms

### POST /api/v1/matchmake

- requiredPlayers: numeric 2..4 (defaults to 2)
- region: optional string

## Current HTTP Response Shapes

The backend is designed to return JSON for both success and error responses.

### Generic error format

```json
{
  "message": "Error message"
}
```

Validation errors may also include `details`.

## Success Response Examples

### Auth register/login

```json
{
  "token": "<jwt>"
}
```

### Create room

```json
{
  "roomId": "room_id"
}
```

### Join room

```json
{
  "roomId": "room_id",
  "players": [
    { "id": "user_id", "username": "player1" }
  ]
}
```

### Matchmake

```json
{
  "status": "queued"
}
```

or

```json
{
  "status": "matched",
  "roomId": "room_id",
  "players": ["user1", "user2"]
}
```

## Copy/Paste API Tests

Register:

```bash
curl -i -X POST http://168.144.71.133/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke1@example.com","username":"smoke1","password":"password123"}'
```

Login:

```bash
curl -i -X POST http://168.144.71.133/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identity":"smoke1","password":"password123"}'
```

Create room:

```bash
TOKEN="<jwt>"
curl -i -X POST http://168.144.71.133/api/v1/rooms \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Room A","maxPlayers":4,"isPrivate":false}'
```

Health:

```bash
curl -i http://168.144.71.133/health
```

## Security Notes

- JWT is required for authenticated routes.
- Passwords are hashed with argon2.
- Private room passwords are compared on join.
- Frontend should never hardcode secrets or assume unauthenticated access to protected routes.

## Socket Events

### Client to server

- `join_room`
- `start_game`
- `play_card`

### Server to client

- `room_joined`
- `state_update`
- `error_event`

### Socket connection example

```js
import { io } from "socket.io-client";

const socket = io("http://168.144.71.133", {
  path: "/ws",
  auth: {
    token: jwtToken
  }
});

socket.emit("join_room", { roomId: "room_id" });
socket.on("room_joined", (payload) => console.log(payload));
socket.on("state_update", (state) => console.log(state));
socket.on("error_event", (err) => console.error(err.message));
```

## Game Rules Exposed by Backend

- 2 to 4 players per match
- Tiki Toast cannot be the first move of a round
- Cards are played one at a time by the current player
- The server decides legality and scoring

## Operational Checks

- `/health` should return `db: true` and `redis: true`
- If it returns false values, do not treat the app as production-ready yet

## Troubleshooting Map

- 400 on register: invalid email, short username, short password, wrong Content-Type
- 400 on create room: out-of-range maxPlayers, empty/short name, empty region/password fields
- 401 on protected route: missing or malformed bearer token
- 502 from Nginx: backend process not listening on 127.0.0.1:3000
- Prisma table errors: run `npm run prisma:generate` and `npx prisma db push` if migrations are absent
