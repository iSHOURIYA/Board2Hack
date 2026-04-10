# Frontend Integration Guide

This guide is the source of truth for integrating the frontend with the live backend.

## 1. Base Configuration

- Base URL (IP mode): http://168.144.71.133
- REST prefix: /api/v1
- Socket.IO path: /ws
- Health endpoint: /health

## 2. Core Integration Rules

1. Backend is authoritative for game state.
2. Frontend should not assume move success before server response.
3. Frontend must send JSON with proper headers for REST calls.
4. Frontend must send JWT for all protected routes and socket auth.
5. Frontend should display backend validation and game errors directly.

## 3. Auth APIs

### POST /api/v1/auth/register

Request body:

```json
{
  "email": "player@example.com",
  "username": "player1",
  "password": "password123"
}
```

Validation rules:

- email: valid email
- username: min 3, max 32
- password: min 8

Success response:

```json
{
  "token": "<jwt>"
}
```

### POST /api/v1/auth/login

Request body:

```json
{
  "identity": "player@example.com",
  "password": "password123"
}
```

Success response:

```json
{
  "token": "<jwt>"
}
```

## 4. Protected REST APIs

For these endpoints, send:

- Authorization: Bearer <jwt>
- Content-Type: application/json

### GET /api/v1/profile

Response shape:

```json
{
  "id": "user_id",
  "email": "player@example.com",
  "username": "player1",
  "gamesPlayed": 12,
  "wins": 4,
  "totalScore": 97,
  "createdAt": "2026-04-09T00:00:00.000Z"
}
```

### GET /api/v1/leaderboards?limit=20

Response shape:

```json
{
  "leaders": [
    {
      "id": "user_id",
      "username": "player1",
      "totalScore": 97,
      "wins": 4,
      "gamesPlayed": 12
    }
  ]
}
```

### GET /api/v1/rooms

Response shape:

```json
{
  "rooms": [
    {
      "id": "room_id",
      "hostId": "host_id",
      "name": "Friendly Table",
      "isPrivate": false,
      "maxPlayers": 4,
      "region": "global",
      "status": "WAITING",
      "createdAt": "2026-04-09T00:00:00.000Z",
      "players": [{ "id": "user_id", "username": "player1" }]
    }
  ]
}
```

### POST /api/v1/rooms

Required body rules:

- name: 2 to 80 chars
- maxPlayers: numeric value 2 to 4
- isPrivate: boolean when present
- password: optional, but if sent must be 4 to 128 chars
- region: optional, but if sent must be 2 to 32 chars

Public room request:

```json
{
  "name": "My Public Room",
  "maxPlayers": 4,
  "isPrivate": false
}
```

Private room request:

```json
{
  "name": "My Private Room",
  "maxPlayers": 4,
  "isPrivate": true,
  "password": "1234",
  "region": "global"
}
```

Success response:

```json
{
  "roomId": "room_id"
}
```

### POST /api/v1/rooms/:roomId/join

Public room body can be empty object:

```json
{}
```

Private room body:

```json
{
  "password": "1234"
}
```

Success response:

```json
{
  "roomId": "room_id",
  "players": [{ "id": "user_id", "username": "player1" }]
}
```

### POST /api/v1/matchmake

Request body:

```json
{
  "requiredPlayers": 2,
  "region": "global"
}
```

Queued response:

```json
{
  "status": "queued"
}
```

Matched response:

```json
{
  "status": "matched",
  "roomId": "room_id",
  "players": ["user1", "user2"]
}
```

## 5. Socket.IO Contract

### Connection

```js
import { io } from "socket.io-client";

const socket = io("http://168.144.71.133", {
  path: "/ws",
  auth: {
    token: jwtToken
  }
});
```

If token is invalid or missing, server rejects connection.

### Client events

join_room

```json
{
  "roomId": "room_id"
}
```

start_game

```json
{
  "roomId": "room_id"
}
```

play_card

```json
{
  "roomId": "room_id",
  "card": "TIKI_UP_2",
  "targetTikiId": 5
}
```

Card values:

- TIKI_UP_1
- TIKI_UP_2
- TIKI_UP_3
- TIKI_TOPPLE
- TIKI_TOAST

Rule note:

- targetTikiId is required for all cards except TIKI_TOAST.

### Server events

room_joined

```json
{
  "roomId": "room_id",
  "playerCount": 2,
  "canStart": true
}
```

state_update

```json
{
  "roomId": "room_id",
  "roundNumber": 1,
  "currentPlayerId": "user1",
  "playerOrder": ["user1", "user2"],
  "players": {
    "user1": {
      "playerId": "user1",
      "secret": { "top": 3, "middle": 6, "bottom": 9 },
      "hand": ["TIKI_UP_1", "TIKI_TOAST"]
    }
  },
  "totemStack": [1, 2, 3, 4, 5, 6, 7, 8, 9],
  "eliminatedTotems": [],
  "cardsPlayedCount": 0,
  "turnNumber": 1,
  "scores": { "user1": 0, "user2": 0 },
  "roundComplete": false,
  "gameComplete": false,
  "maxRounds": 4
}
```

error_event

```json
{
  "message": "TIKI_TOAST cannot be played as the first move of a round."
}
```

## 6. Error Handling Guide

HTTP errors are JSON:

```json
{
  "message": "Error message",
  "details": "Optional validation details"
}
```

Common statuses:

- 400: invalid payload
- 401: missing/invalid token
- 404: missing room/user
- 409: duplicate user
- 500: backend exception

Socket errors arrive as error_event and should be displayed in UI.

## 7. Frequent Frontend Mistakes

Register 400 causes:

- invalid email
- username under 3 chars
- password under 8 chars
- missing Content-Type: application/json

Create room 400 causes:

- name shorter than 2 chars
- maxPlayers outside 2..4
- isPrivate sent as string instead of boolean
- password sent as empty string
- region sent as empty string

### Safe payload builder for room create

```ts
const payload: Record<string, unknown> = {
  name: roomName.trim(),
  maxPlayers: Number(maxPlayers),
  isPrivate: Boolean(isPrivate)
};

if (payload.isPrivate) {
  const value = password.trim();
  if (value.length < 4) {
    throw new Error("Private room password must be at least 4 characters");
  }
  payload.password = value;
}

if (region.trim().length >= 2) {
  payload.region = region.trim();
}
```

## 8. End-to-End Smoke Test (Copy/Paste)

Register:

```bash
curl -i -X POST http://168.144.71.133/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"testa@example.com","username":"testa","password":"password123"}'
```

Login:

```bash
curl -i -X POST http://168.144.71.133/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identity":"testa","password":"password123"}'
```

Create room with token:

```bash
TOKEN="<paste-jwt>"
curl -i -X POST http://168.144.71.133/api/v1/rooms \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Smoke Room","maxPlayers":4,"isPrivate":false}'
```

Health check:

```bash
curl -i http://168.144.71.133/health
```

## 9. Frontend Checklist Before Release

- REST client sets Content-Type: application/json for POST calls
- Auth token is persisted and attached to protected calls
- Socket connects with auth token and path /ws
- Join/start/play socket events match documented payloads
- UI handles error_event and HTTP error JSON gracefully
- Create room request omits empty password and empty region fields
- maxPlayers is always numeric and between 2 and 4
- App polls or checks /health for environment readiness

## 10. Scope Limits in Current Backend

- Active game state is in-memory during runtime.
- Spectator mode is not yet fully exposed.
- Full replay persistence is not implemented yet.
- Multi-round completion logic is partially scaffolded and can be expanded further.

Plan frontend UX accordingly and always trust state_update payloads from server.
