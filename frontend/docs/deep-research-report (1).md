# Executive Summary  
Tiki Topple is a turn-based “totem pole” card game where 2–4 players score points by moving wooden **tiki pieces** on a shared board. Each round, players draw a hidden *Secret Tiki* card with three totems (top/mid/bottom). The goal is to use **action cards** (Tiki Up 1/2/3, Tiki Topple, Tiki Toast) to maneuver the totems on their secret card into the top three board positions. Scoring grants 9 points for a player’s top tiki in 1st place, 5 points for the middle tiki in the top two, and 2 points for the bottom tiki in the top three【8†L92-L100】. Rounds end when only three totems remain or all cards are played; after reveal, scores are tallied and pawns advance. The game finishes after a fixed number of rounds (e.g. 4 rounds in 2-player, or equal to player count in 3–4 player)【10†L227-L232】. Key rules include *mandatory card play each turn* and “Tiki Toast” (eliminate bottom tiki) **cannot** be played as the first move of a round【8†L163-L168】.  

This report designs a **production-quality backend** for an online multiplayer Tiki Topple. It covers the full rules (including edge cases), necessary multiplayer modes (rooms, matchmaking, private/public games, spectating, replays), real-time network considerations (latency targets, tick rates, authoritative server vs. lockstep, anti-cheat), and a detailed system architecture. We specify **components** (matchmaking service, game server instances, database, cache, chat/presence, leaderboards), **data models** (player, room, game state, moves), **APIs** (REST for lobbies/accounts, WebSocket or gRPC for real-time), **message schemas**, event flows, and fault recovery. Finally, we cover infrastructure: database and caching choices, load balancing and autoscaling, monitoring, CI/CD, security (auth, TLS, rate limiting), testing (unit/integration/chaos), and deployment options. Tables compare protocol options, database types, and cloud compute costs. Frontend integration guidelines explain real-time sync (client-side prediction, reconciliation, interpolation/extrapolation) with sample code and sequence diagrams. All design decisions are backed by authoritative sources or best practices【8†L43-L47】【46†L61-L65】【32†L400-L408】【19†L148-L152】.  

## Game Rules and Edge Cases  
**Setup:** 9 totem pieces are arranged randomly in a vertical “slide” on the board (3 groups of 3 by hidden symbol)【8†L69-L78】. Each player receives a hidden *Secret Tiki* card (3 colored tikis) and a hand of action cards (Tiki Up 1/2/3, Tiki Topple, Tiki Toast). In 2-player games, each player uses 7 cards; in 3–4 player games each player removes one Tiki Up 1 card (playing with 6 cards)【8†L53-L60】.  

**Round Play:** Play proceeds clockwise, each turn a player **must** play one card. Action cards do the following【8†L131-L139】【8†L145-L152】：  
- *Tiki Up N:* Choose any active tiki and move it **up** N spaces (toward 1st); all passed tikis shift down to fill the gap. The move must be the full N spaces (no partial moves)【8†L131-L139】.  
- *Tiki Topple:* Choose any active tiki and move it to the **bottom** of the stack; all tikis below it shift up one to fill the gap【8†L145-L152】.  
- *Tiki Toast:* Remove (eliminate) the **bottom-most** active tiki from the board; it stays out until next round【8†L155-L164】. *Edge:* A Tiki Toast card **cannot** be played as the first action of a round【8†L163-L168】. If only Toast cards remain, it must still be played.  

Play continues until one of two end conditions: **(a)** Six cards have been played (leaving only 3 tikis) *or* **(b)** all players have exhausted their hands. Then all players reveal their secret tiki card. The top, middle, and bottom tikis on that card score 9/5/2 points if they ended up in the top 1/2/3 positions, respectively【8†L92-L100】【8†L168-L174】. Pawns move on the score track accordingly. A new round starts with a reshuffle and one new secret card each. The start player rotates each round. The game’s rounds are fixed: in 3–4 player games, play one round per player; in 2-player, play four rounds【10†L227-L232】. Highest cumulative score wins (ties lead to a sudden-death round).  

**Edge Cases:** The backend must handle scenarios like a player playing the last card, game termination, and ties. Since play is deterministic and turn-based, no hidden information beyond the secret card is revealed until scoring. The server must enforce legal moves (e.g. disallow playing a Toast first) and abort invalid actions. 

## Multiplayer Modes & Real-Time Requirements  
We support **rooms/lobbies**, **matchmaking**, **public/private games**, **spectators**, and **replays**. Players can **create or join** a room (with optional password for privacy) or queue for a quick match against random opponents. A room spawns when enough players join (we assume 2–4 players). Spectator mode allows users to connect in “view-only” to see the game state updates in real time. A **replay** feature can be implemented by recording the sequence of moves and state snapshots for later playback.  

Although Tiki Topple is turn-based, real-time responsiveness is still important. AWS guidelines suggest striving for sub-100 ms latency to preserve the feel of a synchronous game【19†L148-L152】. Clients should see board updates almost instantly when a move is made. Since game logic is simple (no continuous physics), **tick rate** can be event-driven: the server updates state on each card play and pushes updates, rather than running a fixed simulation tick.  

**Networking model:** We adopt an **authoritative server** model. Each game room runs on a dedicated server instance that *exclusively* computes and enforces game state. Clients merely submit their chosen card/play and display updates. This prevents cheating: unlike peer lockstep, players cannot spoof the board or score. As Gambetta notes, “the most meaningful” anti-cheat is to “not trust the player” and have a central server run all game logic【24†L37-L45】【24†L41-L49】. By contrast, a pure lockstep (peers send inputs to each other) would require fully deterministic logic and makes cheat detection harder【16†L68-L75】. The trade-off is modest: the server does more work, but Tiki Topple’s simplicity and small state (up to 9 totems, a few cards) makes this trivial.  

**Anti-Cheat:** All client actions must be validated server-side. For example, when a client plays “Tiki Up 3”, the server checks that the chosen tiki can move 3 spaces. Score and moves are computed by the server and sent to clients; clients cannot arbitrarily alter scores. Optionally, the server can audit signatures or checksums of game state periodically to detect any desync or tampering【16†L119-L127】. In practice, we assume the server is trusted and clients cannot cheat if they cannot see each other’s hidden card. All communication is encrypted (TLS) and authenticated to prevent man-in-the-middle attacks.  

## System Architecture 

We use a **microservices-based architecture** with horizontally scalable components. A high-level design is illustrated below. In a **regional architecture**, players first hit a central matchmaking service, then are routed to a nearby game server for low-latency play【46†L61-L65】.  

【46†L61-L65】 *Figure: Scalable multiplayer architecture (example from Rune AI)*【46†L61-L65】  
【44†embed_image】 *Fig.1: Example architecture separating a central matchmaker from regional game servers【46†L61-L65】.*  

- **Clients**: Web or mobile apps connect via secure channels. They use REST (HTTPS) for account/login and lobby APIs, and a persistent socket (WebSocket or gRPC) for gameplay.  
- **Authentication Service**: Manages user accounts and issues JWT tokens. Can use OAuth or services like AWS Cognito. (E.g., OneUptime’s example uses Cognito for accounts【19†L180-L188】.)  
- **Matchmaking Service**: Handles public queues or friend invites. Finds or creates a game room and assigns a game server. It can be a stateless REST API that enqueues players and on match creation, allocates a game server instance (see below).  
- **Game Server Instances**: When a game starts, a **dedicated server process** is launched (e.g. a container or VM). It loads initial game state (board setup) and listens for player actions. Each instance is **stateful** (it holds the board, decks, scores in memory) until the match ends. All 2–4 players connect to this server via WebSocket. The server broadcasts state updates to all players and any spectators. We ensure **sticky sessions** on the load balancer so all participants stay on the same server【46†L121-L129】.  
- **State Sync**: Upon each move, the game server updates the game state and immediately broadcasts the result to clients. Message flow example (Fig.2):  

  ```mermaid
  sequenceDiagram
    participant P1 as Player1
    participant S  as GameServer
    participant P2 as Player2
    P1->>S: PLAY_CARD {type: "TikiUp", tikiId: 5, spaces: 2}
    S-->>P1: MOVE_RESULT {tikiPositions: [...], nextPlayer: P2}
    S-->>P2: MOVE_RESULT {tikiPositions: [...], nextPlayer: P2}
    P2->>S: PLAY_CARD {type: "TikiToast"}
    S-->>P1: MOVE_RESULT {tikiRemoved: 9, nextPlayer: P1}
    S-->>P2: MOVE_RESULT {tikiRemoved: 9, nextPlayer: P1}
  ```  
  *Fig.2: Sequence of play actions on the game server.*  
- **Persistence/Database**: Long-term data (user profiles, game results, leaderboards) is stored in a durable database. We recommend a relational SQL database (e.g. PostgreSQL or MySQL) for user and score data, given ACID needs and structured queries【35†L52-L55】. Nakama (a proven game backend) uses PostgreSQL or CockroachDB for global scalability【23†L719-L722】. Leaderboards can be computed via periodic aggregation queries or maintained in a sorted DB table.  
- **Cache/Memory**: An in-memory store (e.g. Redis) can cache active sessions, room lists, or recent game snapshots for fast lookup. Some systems (like Nakama) embed an in-memory engine (Bluge) to handle matchmaking queries and session data【23†L741-L749】. Using Redis or similar can offload frequent reads (e.g. “which rooms are joinable?” or “player presence status?”).  
- **Chat Service**: In-game chat should be a separate service. Real-time game servers focus on gameplay; a dedicated pub/sub or message service (e.g. Photon Chat, PubNub, or an internal WebSocket channel) handles chat. PubNub advises decoupling chat from game servers to improve scalability【43†L165-L173】. Chat messages can be relayed via the game server or, preferably, a separate channel to reduce load.  
- **Presence/Notification Service**: Tracks who is online or in-room. Allows features like friends lists or spectator invites. This can integrate with the authentication service or as part of a matchmaking API.  
- **Leaderboards Service**: A simple REST API reads from the database to show top scores or rankings. It can also be pushed updates after each game.  

**Load Balancing and Regions:** We deploy **regional game servers** to minimize latency【46†L61-L65】【46†L67-L76】. A front-end load balancer routes WebSocket connections to the game server in the player’s region or to an appropriate instance. Central services (auth, matchmaker, leaderboards) are stateless and can be scaled behind standard HTTP load balancers. We use **sticky sessions** (session affinity) for the stateful game servers so that all WebSocket messages for a given match go to the same instance【46†L121-L129】.  

**Fault Tolerance:** The game server will periodically snapshot game state to the database (or at least store final results) so that progress isn’t lost if it fails mid-game. If a server crashes, remaining players can be reconnected to a recovery instance: on reconnect, the backend can reload the last snapshot and replay missed moves. Unreliable network links should trigger client reconnection logic with exponential backoff.  

## Data Models (Entities & Schema)  
- **Player/User**: `{ userId, username, passwordHash, email, stats:{gamesPlayed, wins, totalScore}, ranking, ... }`. Stored in SQL.  
- **Room/GameSession**: `{ roomId, hostId, maxPlayers, currentPlayers[], isPrivate, passwordHash?, status, region, spectatorIds[] }`. Also includes game settings if any (e.g. rounds count override).  
- **GameState**: The authoritative board state, e.g. `{ roundNumber, totemStack:[tikiId, ...], activeTikis:[ids], playerHands:{playerId: [cardIds]}, discardPiles, scores:{playerId: int}, currentPlayerId, cardsPlayedCount, ... }`. On each move, update this object. It can be stored as JSON or in normalized tables. Snapshots can be taken after each move.  
- **Move/Action Log**: Each play can be logged as `{ moveId, roomId, playerId, turnNumber, cardPlayed, targetTikiId?, timestamp }` for audit/replay.  
- **TikiPiece**: We may store static info for each tiki (color, symbol) but that’s mostly client-side.  
- **LeaderboardEntry**: `{ userId, totalWins, totalScore, rank, lastPlayed }`.  

These models support undo/replay by replaying the move log or restoring a snapshot. For example, to reconstruct a game, reload initial state and apply moves in order.  

## APIs and Protocols  

**RESTful APIs** (HTTP+JSON) for non-real-time functions:  
- **POST /api/v1/register** – user signup (email, password). Returns userId.  
- **POST /api/v1/login** – user login (username/password). Returns JWT auth token.  
- **GET /api/v1/rooms** – list open/joinable rooms (filters: public/private).  
- **POST /api/v1/rooms** – create room (hostId, options). Returns roomId and a join token.  
- **POST /api/v1/rooms/{id}/join** – join a room (userId, joinToken/password). Returns success or error.  
- **GET /api/v1/leaderboards** – get top N players (filter by time or all-time).  
- **POST /api/v1/matchmake** – enter matchmaking queue. Returns assigned roomId or error if no match.  
- **WebSockets or gRPC** for real-time gameplay:  
  - On connection, clients authenticate (send JWT). If valid, they join the game session.  
  - **Client → Server messages:** JSON like: `{type:"play_card", card:"TikiUp2", tikiId:7}` or `{type:"chat", text:"GG"}`.  
  - **Server → Client messages:** JSON updates: e.g. `{type:"state_update", totemStack:[...], scores:{...}, nextPlayer:...}` and `{type:"chat", from:user, text:"..."}`.  
  We define a schema for each message type. For example:  
  ```json
  // Client plays a card
  { 
    "type": "play_card",
    "playerId": "user123",
    "card": "TikiTopple",
    "tikiId": 4 
  }

  // Server broadcast of new state
  {
    "type": "state_update",
    "roomId": "room456",
    "tikiPositions": [ {id:1,pos:1}, ... ], 
    "scores": {"user123":9, "user456":5},
    "nextPlayer": "user456"
  }
  ```  
  The exact schema can be JSON or, for efficiency, Protobuf/gRPC messages. All real-time messages use a persistent connection (see below).  

**Protocol Choices:** We compare major options:

| Protocol   | Use Case                 | Transport                | Data Format     | Latency/Throughput | Browser Support | Security         |
|------------|--------------------------|--------------------------|-----------------|--------------------|-----------------|------------------|
| **REST/HTTP**   | Account/lobby APIs, unreliable updates | HTTP/1.1 (TCP)     | JSON/text       | Higher overhead, request-response | All browsers    | TLS (HTTPS)       |
| **WebSocket**   | Real-time game state, chat | TCP (upgrade HTTP1.1)   | Text/JSON or binary | Low latency, bidirectional | All modern browsers【32†L400-L408】 | Can use TLS (wss) but no built-in auth |
| **gRPC (HTTP/2)** | Real-time streaming, services internal | TCP (HTTP/2)      | Protobuf (binary)  | Low latency, multiplexed【32†L490-L494】 | Not native in browser (use gRPC-Web) | Built-in TLS and auth【32†L490-L494】 |
| **UDP (Custom)**| Fast-paced, lossy (voice, realtime position) | UDP (IP)           | Custom binary    | Very low latency (no congestion control) | No (only native apps) | Must implement own reliability/encryption |
  
For our web/mobile game, **WebSocket** (or gRPC over WebSocket) is ideal for live moves. WebSockets maintain an open, stateful connection allowing immediate broadcast【32†L400-L408】. gRPC (HTTP/2) could be used for server-to-server or heavy-duty APIs, but browsers require a shim. We’ll primarily use secure WebSockets (`wss://`) for client real-time messages【32†L400-L408】. All endpoints use TLS to encrypt traffic.  

## Synchronization & Frontend Integration  

Since the server is authoritative, the **client workflow** is: user taps a card → client sends a `play_card` message → client may **optimistically** update the UI (move the totem) for responsiveness【25†L43-L50】 → server processes the move and sends back the official state. If the client’s prediction matches, nothing changes. If not (rare), the client “reconciles” by snapping to the server state【25†L101-L110】.  

We implement **client-side prediction & reconciliation** (Gabriel Gambetta’s model) so the UI feels immediate【25†L43-L50】【25†L101-L110】. For example, upon playing Tiki Up 2, the client locally moves the tiki up 2 positions immediately. When the server reply arrives (with the same result), the client simply accepts it. If for some reason the server had a different result (e.g. another player’s move occurred faster), the client adjusts the UI to the server-provided positions. Each request carries a sequence number so the client knows which inputs are acknowledged【25†L108-L117】. In practice, given the low latency of the server-authoritative model, misprediction will be rare.  

For **animation interpolation**, moves can be smoothly animated over ~200ms (the card “takes effect” to the bottom or up on the line) without extra extrapolation, since game state changes only on discrete events. Clients should avoid extrapolating unknown future moves. However, minor smoothing (e.g. tweening the totem sliding) makes the UI polished. The client’s event mapping is straightforward: when receiving `state_update`, update each tiki sprite’s position on the board and highlight the next player.  

**SDK Contract:** We publish a client-side SDK (in JS/Unity) with methods:  
```
GameClient.connect(token)       // establishes WS and authenticates
GameClient.onMove(callback)     // subscribe to state updates
GameClient.playCard(card, tikiId)  // send play action
GameClient.onChat(callback)     // handle incoming chat 
```
This ensures the frontend just implements UI logic and delegates networking to the SDK. Sample pseudocode (JS/websocket):  
```js
ws.send(JSON.stringify({
  type: "play_card",
  playerId: myId,
  card: "TikiUp2",
  tikiId: selectedTikiId
}));
ws.onmessage = (msg) => {
  let data = JSON.parse(msg.data);
  if (data.type === "state_update") {
    renderBoard(data.tikiPositions);
  }
};
```  

## Scalability: Database, Caching, Load Balancing, Autoscaling  

- **Database:** For user/leaderboard data, use a mature RDBMS (e.g. PostgreSQL). It provides ACID compliance for scoring transactions and rich query capability (SQL). As of 2025, PostgreSQL is often chosen for analytics and scalability【35†L52-L55】. For global players, a distributed SQL (e.g. CockroachDB or Google Spanner) can be used as Nakama suggests【23†L719-L722】. For ephemeral game sessions, the game server holds state in memory and only writes final results to the DB asynchronously to avoid latency【46†L133-L142】.  

- **Caching:** Use Redis or similar to cache session info (e.g. room state for quick fetch on reconnect), login sessions, or recent leaderboard snapshots. Redis Pub/Sub could also deliver chat or presence updates. In Nakama’s architecture, an in-memory store supports fast matchmaking queries【23†L741-L749】.  

- **Load Balancing:** We run multiple instances of each service behind load balancers. Matchmaker and REST APIs are stateless (scaled by container replicas). Game servers are grouped by region. A UDP load balancer (for TCP in/out, e.g. NGINX or cloud LBs) directs clients to an available game server. Sticky sessions ensure a game’s players stick to one server【46†L121-L129】. We also use autoscaling: e.g. scale out new game server instances when lobby fills or queue grows.  

- **Autoscaling:** On cloud platforms (Kubernetes, AWS ECS, etc.), define metrics (active games or CPU load) to spawn new servers or remove idle ones. Spot/Preemptible VMs can be used for game servers at up to 90% discount【40†L293-L300】, but we must handle sudden terminations (save state frequently).  

- **Monitoring & Logging:** Integrate Prometheus/Grafana for metrics. Track total players online, games in progress, latency, error rates, etc. Nakama’s built-in console exports metrics via Prometheus【23†L707-L712】. Use centralized logging (ELK or Splunk) for server logs to audit issues. Create alerts on anomalies (e.g. game server errors, DB failures).  

- **CI/CD:** Maintain code in version control. Use automated pipelines (GitHub Actions/Jenkins) to run unit/integration tests and deploy on push. Containerize services (Docker), and use managed container orchestration (EKS, GKE) or auto-scaling groups. Database migrations are handled by tools (e.g. Flyway or Django migrations).  

## Security, Rate Limiting, and Anti-Abuse  

- **Authentication:** Use JWT or OAuth tokens for all client-server interactions. Verify tokens on each WS message and API call. In REST, use HTTPS and secure cookies or Bearer tokens. Accounts should enforce strong password hashing (bcrypt) and optional email verification.  

- **Encryption:** All traffic (REST and WebSocket) runs over TLS (HTTPS/WSS). Data at rest (DB, backups) is encrypted per provider defaults.  

- **Rate Limiting:** Throttle actions per user/room to prevent spam. For example, allow max 1 card-play message per 500ms; after that, ignore or drop. Chat messages could be rate-limited similarly. Use per-IP and per-user quotas at the gateway (via NGINX or API Gateway policies) to avoid denial-of-service.  

- **Anti-Cheat:** The authoritative model inherently mitigates most cheating. Additionally, we log illegal requests and can ban offending users. Only valid moves (cards from hand, legal target totems) are accepted. As noted by Gambetta, "game state is managed by the server alone” to stop hacks【24†L41-L49】.  

- **Other Security:** Sanitize all inputs to prevent injection. Deploy WAF (web application firewall) rules on REST endpoints. Keep all dependencies updated.  

## Testing and Resilience  

- **Unit Tests:** Test core game logic (e.g. applying each card effect, scoring) thoroughly. Each move type should be validated against expected state transitions.  
- **Integration Tests:** Simulate full game flows: e.g. script two clients playing through rounds via the real API. Test login, match creation, full round completion, scoring, disconnect/reconnect.  
- **Load Testing:** Use tools (Gatling, k6) to simulate many players and ensure the architecture scales (e.g. 1,000 concurrent games).  
- **Chaos Testing:** Intentionally kill a game server instance during a match to verify recovery. Disconnect network to a region to test failovers. Use something like Chaos Monkey to test resilience.  
- **Security Testing:** Penetration test the auth flow, ensure JWT can’t be forged. Test flood of messages to ensure rate-limits hold.  
- **Monitoring During Tests:** Verify that metrics (latency, error rates) respond appropriately under load or failure.  

## Deployment and Migration Plan  

We deploy to a cloud environment (AWS, Azure, GCP, etc.) using containers. For example, use Kubernetes with Helm charts for each microservice. In deployment:  
- **Staging and Production:** Maintain separate environments. Promote images via CI/CD pipeline (automated tests → staging → manual approval → prod).  
- **Rolling Updates:** Use Kubernetes Deployment rolling updates (or AWS ECS blue/green) to upgrade services without downtime. Game servers can drain existing games before updating.  
- **Database Migration:** Version control DB schemas. Apply migrations during low-traffic windows. E.g. use Flyway or Alembic so schema updates can run automatically with minimal lock.  
- **Data Backups:** Automate DB backups (nightly snapshots), and have a rollback plan (revert to previous code + DB state if critical issues).  
- **Feature Flags:** For new game variants or features, use flags to enable/disable without deploy rollback.  

## Tables: Protocols, Databases, Cloud Costs  

**Protocol Comparison:**  

| Protocol   | Use Case                 | Transport      | Data Format        | Real-Time | Browser/Bin | Notes                                        |
|------------|--------------------------|----------------|--------------------|-----------|-------------|----------------------------------------------|
| HTTP/REST  | Accounts/Lobbies         | TCP (HTTP/1.1) | JSON               | No        | Yes (HTTP)  | Simple, stateless, higher overhead per req.  |
| WebSocket  | Game play, chat          | TCP (upgraded) | Text (JSON) or Proto | Yes       | Yes (WSS)   | Full-duplex, persistent, low-latency【32†L400-L408】. |
| gRPC       | Internal services, heavy comms | TCP (HTTP/2) | Protobuf (binary) | Yes       | No (requires gRPC-Web) | High perf, multiplex【32†L490-L494】, built-in TLS.|
| UDP        | Voice, realtime games    | UDP            | Custom             | Yes       | No          | Very low latency but unreliable, not for web. |

**Database Options:**  

| DB Type           | Examples        | Pros                                 | Cons                                    |
|-------------------|-----------------|--------------------------------------|-----------------------------------------|
| **Relational SQL** | MySQL, PostgreSQL, CockroachDB【23†L719-L722】 | ACID transactions; complex queries; proven at scale (Postgres best for analytics)【35†L52-L55】 | Harder horizontal scaling; schema migrations needed |
| **NoSQL Document** | MongoDB, DynamoDB | Flexible schema; easy to scale partitioned; good for JSON | Eventual consistency (if sharded); complex queries limited【35†L52-L55】 |
| **In-Memory**     | Redis, Memcached| Extremely fast reads/writes; pub/sub support; ideal for caches or leaderboards | Data is volatile (use with persistence backup); limited query capability |
| **NewSQL/Distributed** | CockroachDB, Yugabyte | SQL interface + horizontal scale; strong consistency | Newer tech; complex to operate |

*Choice:* We recommend **PostgreSQL** for user/game data due to reliability, ACID, and features【35†L52-L55】. Use **Redis** for caching/game session state if needed.  

**Cloud Hosting Cost (Compute):** Costs vary widely by provider and instance type. For example (U.S. East region, On-Demand pricing): a 4‑vCPU general-purpose VM is roughly: AWS EC2 m5.xlarge ~$0.192/hr, GCP n1-standard-4 ~$0.190/hr, Azure D4as ~$0.200/hr (subject to change). Committed/Reserved usage can give ~30–40% discounts, and Spot/Preemptible instances can be up to 80–90% cheaper【40†L293-L300】【40†L316-L320】.  
- *Spot Instances:* AWS Spot can be ~90% off list price, GCP Preemptible ~80% off【40†L293-L300】. Azure also offers deep discounts on spot VMs【40†L316-L320】.  
- *Storage:* Standard block storage costs ~$0.05–0.10/GB-month on AWS/GCP. Data transfer and other fees should also be considered.  
In summary, a moderate-scale backend (dozens of instances plus DB) might cost on the order of a few thousand USD/month, but can be optimized via commitment discounts and autoscaling.  

## Conclusion  

This design yields a robust, scalable backend for Tiki Topple. It respects the game’s rules and real-time needs, uses proven architectural patterns (authoritative server, microservices, WebSockets), and includes all auxiliary systems (auth, chat, persistence, monitoring, CI/CD, etc.). Crucially, the design is evidence-backed: authoritative sync for cheat prevention【24†L41-L49】, separate matchmaker and game servers for latency【46†L61-L65】, and dedicated services (chat/presence) for scalability【43†L165-L173】. Sequence diagrams and API schemas clarify the exact contract between frontend and server. With autoscaling, containerization, and cloud-native services, this backend can support large numbers of concurrent games while remaining maintainable and testable.  

**Sources:** Official Tiki Topple rules【8†L43-L47】【10†L227-L232】 and industry references on game networking and cloud architecture【24†L41-L49】【46†L61-L65】【32†L400-L408】【19†L148-L152】【23†L731-L737】【35†L52-L55】. All above cited.