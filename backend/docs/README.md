# Backend Documentation Index

Use these documents in order while integrating the frontend.

## 1. Frontend Integration Guide

- File: [frontend-contract.md](frontend-contract.md)
- What it contains:
  - Base URLs and paths
  - Auth flow and token usage
  - REST endpoint payloads and response shapes
  - Socket.IO event contract
  - Error handling strategy
  - Common frontend mistakes and fixes
  - Copy/paste smoke test commands

## 2. API Reference

- File: [backend-api-reference.md](backend-api-reference.md)
- What it contains:
  - Endpoint list and auth requirements
  - Validation matrix for each write endpoint
  - Generic error and success response patterns
  - Socket event list and quick client example
  - Troubleshooting map for common deployment/API issues

## 3. VPS Deployment Guide

- File: [vps-deployment-guide.md](vps-deployment-guide.md)
- What it contains:
  - Server setup and package installation
  - Env configuration and database setup
  - Prisma build/deploy flow
  - systemd service setup
  - Nginx domain and IP-only reverse proxy setup
  - TLS and operational troubleshooting

## Recommended Frontend Workflow

1. Implement auth screens using the payload rules in [frontend-contract.md](frontend-contract.md).
2. Build lobby and room flows using create/join/list/matchmake from [backend-api-reference.md](backend-api-reference.md).
3. Integrate game room Socket.IO flow using client/server event specs from [frontend-contract.md](frontend-contract.md).
4. Validate all flows with curl smoke tests from [backend-api-reference.md](backend-api-reference.md).
5. If backend behavior differs, check deployment/runtime issues via [vps-deployment-guide.md](vps-deployment-guide.md).
