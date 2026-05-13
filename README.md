# PollBoard

PollBoard is a MERN-based realtime polling platform for classrooms, student teams, demos, and small communities. It lets creators build polls with multiple questions, control who can vote, publish results when ready, and follow live analytics as responses come in.

## Features

- JWT authentication with signup, login, current-user lookup, and logout
- Multi-question poll creation with dynamic options
- Required and optional questions
- Anonymous or authenticated voting modes
- Poll expiry and manual closing support
- Creator-only private analytics before publishing
- Public results after publishing
- Publish Results flow that closes voting automatically
- Realtime results updates with Socket.IO poll rooms
- Dashboard analytics with charts and participation summaries
- Loading, toast, empty, and error states for common flows

## Tech Stack

- Frontend: React, Vite, React Router DOM, Tailwind CSS, Axios, Recharts, Socket.IO Client
- Backend: Node.js, Express, MongoDB, Mongoose, JWT, Socket.IO
- Security: Helmet, CORS, express-rate-limit

## Project Structure

```text
PollBoard/
├── client/
│   ├── src/
│   └── .env.example
├── server/
│   ├── src/
│   └── .env.example
└── README.md
```

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/AkhtarRazaMirza/PollBoard.git
cd PollBoard

cd server
npm install

cd ../client
npm install
```

### 2. Configure environment variables

Create `.env` files in both `server/` and `client/` using the included examples.

Server variables:

```env
PORT=8080
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/pollboard
ACCESS_TOKEN_SECRET=replace_me
REFRESH_TOKEN_SECRET=replace_me
CLIENT_URL=http://localhost:5173
# Or comma-separated:
# CLIENT_URLS=http://localhost:5173,http://127.0.0.1:5173
RATE_LIMIT_MAX=200
```

Client variables:

```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_SOCKET_URL=http://localhost:8080
```

### 3. Run the apps

Backend:

```bash
cd server
npm run dev
```

Frontend:

```bash
cd client
npm run dev
```

## API Overview

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Polls

- `GET /api/polls/recent`
- `GET /api/polls`
- `GET /api/polls/:pollId`
- `POST /api/polls` `auth required`
- `GET /api/polls/my-polls` `auth required`
- `POST /api/polls/:pollId/vote`
- `GET /api/polls/:pollId/results`
- `PATCH /api/polls/:pollId/publish` `owner only`

## Realtime Architecture

Socket.IO traffic is scoped per poll instead of being broadcast globally.

### Flow

1. A client viewing a results page connects to Socket.IO.
2. The client emits `poll:join` with the poll id.
3. The server joins that socket to `poll:<pollId>`.
4. After a vote or publish action, the server emits `poll:results-updated` only to that room.
5. The client updates the visible analytics and disconnects on unmount.

This keeps live updates focused on the poll that is actually being viewed.

## Poll Rules

- `voteAccess: "anonymous"` allows public voting
- `voteAccess: "authenticated"` requires a valid JWT
- Required questions must be answered before a vote is accepted
- Expired polls reject new votes
- Closed polls reject new votes
- Publishing results closes the poll automatically
- Results stay private until published, except for the creator

## Deployment Guide

### Frontend on Vercel

- Root directory: `client`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables:
  - `VITE_API_BASE_URL=https://your-render-api.onrender.com/api`
  - `VITE_SOCKET_URL=https://your-render-api.onrender.com`

### Backend on Render

- Root directory: `server`
- Build command: `npm install`
- Start command: `npm run dev`
- Environment variables:
  - `PORT`
  - `MONGO_URI`
  - `ACCESS_TOKEN_SECRET`
  - `REFRESH_TOKEN_SECRET`
  - `CLIENT_URL` or `CLIENT_URLS`
  - `RATE_LIMIT_MAX`

### Database on MongoDB Atlas

- Create a cluster
- Add a database user
- Add your Render IP rules or allow trusted access as needed
- Copy the connection string into `MONGO_URI`

## Screenshots

Add screenshots to these suggested locations when preparing the final submission:

- `docs/screenshots/home.png`
- `docs/screenshots/create-poll.png`
- `docs/screenshots/dashboard.png`
- `docs/screenshots/results.png`

## Verification

Useful commands:

```bash
cd server && npm run lint
cd client && npm run lint
cd client && npm run build
```

## Notes

- The frontend expects the backend to return the shared API shape:
  - `success`
  - `statusCode`
  - `message`
  - `data`
- Results charts use Recharts in the dashboard while the results page keeps a simpler bar layout.
- CORS and socket origins are environment-driven for easier local and hosted deployments.