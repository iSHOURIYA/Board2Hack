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

## Current HTTP Response Shapes

The backend is designed to return JSON for both success and error responses.

### Generic error format

```json
{
  "message": "Error message"
}
```

Validation errors may also include `details`.

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

## Game Rules Exposed by Backend

- 2 to 4 players per match
- Tiki Toast cannot be the first move of a round
- Cards are played one at a time by the current player
- The server decides legality and scoring

## Operational Checks

- `/health` should return `db: true` and `redis: true`
- If it returns false values, do not treat the app as production-ready yet
