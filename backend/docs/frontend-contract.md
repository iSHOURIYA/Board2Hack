# Frontend Contract

This document defines the backend behavior the frontend must follow to avoid desync, invalid actions, and avoidable runtime errors.

## Goals

- Keep the frontend aligned with the live backend contract.
- Make all requests and socket events predictable.
- Expose clear error handling so the UI can show the correct user message.
- Ensure the game remains server-authoritative.

## Core Principles

1. The server is the source of truth for game state.
2. The frontend may optimistically animate, but it must always reconcile to server state.
3. The frontend should never assume a move succeeded until the server emits the updated state.
4. All gameplay actions must be blocked client-side if the UI already knows the action is invalid, but the backend still performs final validation.
5. Every server error should be displayed in a user-facing way unless it is a low-level network failure.

## Environment Assumptions

The backend exposes:

- HTTP on the configured `PORT`
- Socket.IO on path `/ws`
- REST APIs under `/api/v1`
- Health endpoint at `/health`

## Authentication Flow

### Register

`POST /api/v1/auth/register`

Request:

```json
{
  "email": "player@example.com",
  "username": "player1",
  "password": "strongpassword"
}
```

Response:

```json
{
  "token": "jwt-token"
}
```

Validation rules:

- email must be a valid email address
- username must be 3 to 32 characters
- password must be at least 8 characters

### Login

`POST /api/v1/auth/login`

Request:

```json
{
  "identity": "player@example.com",
  "password": "strongpassword"
}
```

Response:

```json
{
  "token": "jwt-token"
}
```

`identity` may be either the email or username.

### Frontend guidance

- Store the token securely in memory or an appropriate session mechanism for your frontend stack.
- Send it as `Authorization: Bearer <token>` for REST calls.
- Send it as Socket.IO auth token when connecting to gameplay.

## REST API Contract

### Health

`GET /health`

Response:

```json
{
  "status": "ok",
  "db": true,
  "redis": true
}
```

Use this for startup checks and deployment monitoring.

### Profile

`GET /api/v1/profile`

Headers:

- Authorization: Bearer token

Response:

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

### Leaderboards

`GET /api/v1/leaderboards?limit=20`

Response:

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

### Create Room

`POST /api/v1/rooms`

Headers:

- Authorization: Bearer token

Request:

```json
{
  "name": "Friendly Table",
  "maxPlayers": 4,
  "isPrivate": true,
  "password": "roompass",
  "region": "global"
}
```

Response:

```json
{
  "roomId": "room_id"
}
```

Validation rules:

- name: 2 to 80 characters
- maxPlayers: 2 to 4
- password required if room is private

### List Rooms

`GET /api/v1/rooms`

Response:

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
      "players": [
        {
          "id": "user_id",
          "username": "player1"
        }
      ]
    }
  ]
}
```

### Join Room

`POST /api/v1/rooms/:roomId/join`

Headers:

- Authorization: Bearer token

Request for private room:

```json
{
  "password": "roompass"
}
```

Response:

```json
{
  "roomId": "room_id",
  "players": [
    {
      "id": "user_id",
      "username": "player1"
    }
  ]
}
```

### Matchmake

`POST /api/v1/matchmake`

Headers:

- Authorization: Bearer token

Request:

```json
{
  "requiredPlayers": 2,
  "region": "global"
}
```

Response when queued:

```json
{
  "status": "queued"
}
```

Response when matched:

```json
{
  "status": "matched",
  "roomId": "room_id",
  "players": ["user1", "user2"]
}
```

## Socket.IO Contract

### Connection

Connect with:

- path: `/ws`
- auth token in `auth.token` or `Authorization` header

Example:

```js
const socket = io(BASE_URL, {
  path: "/ws",
  auth: {
    token: jwtToken
  }
});
```

If the token is missing or invalid, the socket connection is rejected.

### Events emitted by the client

#### `join_room`

Payload:

```json
{
  "roomId": "room_id"
}
```

Purpose:

- joins the Socket.IO room
- allows the backend to count connected players
- enables the frontend to receive `room_joined` or `state_update`

#### `start_game`

Payload:

```json
{
  "roomId": "room_id"
}
```

Purpose:

- asks the server to create the initial game state
- requires 2 to 4 connected players in that room

#### `play_card`

Payload:

```json
{
  "roomId": "room_id",
  "card": "TIKI_UP_2",
  "targetTikiId": 5
}
```

Rules:

- The current player must own the turn.
- The selected card must be in that player's hand.
- `targetTikiId` is required for all moves except `TIKI_TOAST`.
- `TIKI_TOAST` cannot be the first move of a round.
- The server rejects any invalid move.

### Events emitted by the server

#### `room_joined`

Payload:

```json
{
  "roomId": "room_id",
  "playerCount": 2,
  "canStart": true
}
```

Frontend use:

- show lobby occupancy
- enable or disable the Start button

#### `state_update`

Payload shape:

```json
{
  "roomId": "room_id",
  "roundNumber": 1,
  "currentPlayerId": "user1",
  "playerOrder": ["user1", "user2"],
  "players": {
    "user1": {
      "playerId": "user1",
      "secret": {
        "top": 3,
        "middle": 6,
        "bottom": 9
      },
      "hand": ["TIKI_UP_1", "TIKI_TOAST"]
    }
  },
  "totemStack": [1,2,3,4,5,6,7,8,9],
  "eliminatedTotems": [],
  "cardsPlayedCount": 0,
  "turnNumber": 1,
  "scores": {
    "user1": 0,
    "user2": 0
  },
  "roundComplete": false,
  "gameComplete": false,
  "maxRounds": 4
}
```

Frontend rules:

- Always replace local board state with the server payload.
- Re-render cards, score, and turn indicator from this object.
- Secret cards may be hidden in UI if you do not want to reveal them to the player.

#### `error_event`

Payload:

```json
{
  "message": "TIKI_TOAST cannot be played as the first move of a round."
}
```

Use this for toast notifications or inline move errors.

## Game State UI Rules

### Board state rendering

The frontend should render the board from `totemStack`.

- Index 0 is the top position.
- The last item is the bottom position.
- The top three positions are the scoring positions at round end.

### Move handling

Recommended UI sequence:

1. Player clicks a card.
2. Frontend checks basic local rules.
3. Frontend sends `play_card`.
4. Frontend shows a pending animation.
5. Backend responds with `state_update` or `error_event`.
6. Frontend either confirms the animation or rolls it back.

### Safe frontend behavior

- Never permanently mutate local state before the server reply.
- If a server error arrives, discard the local prediction.
- Disable the move button while awaiting a response if the UX is turn-based and single-action.
- Reconnect automatically on socket drop.
- After reconnect, re-send `join_room` and request a fresh `state_update` if needed.

## Error Handling Contract

### HTTP errors

The backend returns JSON errors in this shape:

```json
{
  "message": "Something went wrong"
}
```

Validation errors may include a `details` field.

Common expected cases:

- 400 - invalid request body or bad query parameters
- 401 - missing or invalid token
- 404 - room or user not found
- 409 - duplicate user or username
- 500 - unexpected server failure

### Socket errors

Socket errors are delivered as `error_event` objects.

Frontend should:

- display the message to the user
- keep the socket alive unless the connection itself is broken
- leave the room if the server says the match is invalid or closed

## Frontend Integration Checklist

Before shipping the UI, verify the frontend does all of the following:

- Sends the JWT on both REST and socket connections
- Handles room create/join/matchmake success states
- Renders waiting room occupancy
- Disables move buttons when it is not the player's turn
- Applies server `state_update` as the final state
- Shows server error messages directly
- Handles reconnect automatically
- Avoids assuming round completion locally
- Keeps lobby and game screen state separate

## Recommended Component Model

A clean frontend usually needs these state groups:

- auth state
- profile state
- rooms lobby state
- active room socket state
- game board state
- transient error state
- reconnect state

## Known Backend Limits

The current backend implementation is an MVP foundation.

- Game state currently lives in memory during a match.
- Full persistence of active matches is not yet implemented.
- Replays are not yet stored.
- Spectator support is not yet exposed in the socket contract.
- Round progression beyond a single round still needs expansion.

The frontend should therefore be defensive:

- treat reconnects as possible mid-match
- avoid assuming a full replay archive exists
- gracefully handle state refreshes

## Suggested Next Backend Improvements

These are the best follow-up items if you want even fewer frontend errors:

- persist active games to Redis and database snapshots
- add a formal OpenAPI file
- add a shared TypeScript package for API and socket types
- add runtime schema serialization for socket payloads
- expose spectator and replay endpoints
- add per-event acknowledgements with request IDs

## Minimal Frontend Example

```js
async function playMove(socket, roomId, card, targetTikiId) {
  socket.emit("play_card", {
    roomId,
    card,
    targetTikiId
  });
}

socket.on("state_update", (state) => {
  renderGame(state);
});

socket.on("error_event", (event) => {
  showToast(event.message);
});
```

## Final Rule

If the frontend and backend disagree, the backend wins.
