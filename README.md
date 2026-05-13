# PollBoard

PollBoard is a production-style MERN polling platform for classrooms, student teams, demo days, clubs, and hackathons. Creators can build multi-question polls, control who can vote, watch live analytics update in real time, and publish results when they are ready.

## Highlights

- JWT authentication with signup, login, protected routes, current-user lookup, and logout
- Multi-question poll builder with required and optional questions
- Anonymous or authenticated voting modes
- Poll expiry enforcement on both backend and frontend
- Published-results workflow that closes voting and exposes public analytics
- Duplicate submission prevention for authenticated users and anonymous browser/device voters
- Room-based Socket.IO updates for live analytics, response counts, and viewer presence
- Responsive analytics workspace with Recharts, export CSV, and print-friendly reporting
- Zod request validation, centralized API errors, and route-level rate limiting
- React Hot Toast, motion polish, skeleton states, empty states, and improved mobile navigation

## Stack

- Frontend: React, Vite, React Router DOM, Tailwind CSS, Axios, Recharts, Socket.IO Client, Framer Motion, React Hot Toast
- Backend: Node.js, Express, MongoDB, Mongoose, Socket.IO, Zod
- Security and ops: Helmet, CORS, express-rate-limit, JWT

## Architecture

```text
PollBoard/
|-- client/
|   |-- src/
|   |   |-- components/
|   |   |-- hooks/
|   |   |-- pages/
|   |   |-- services/
|   |   `-- utils/
|   `-- .env.example
|-- server/
|   |-- src/
|   |   |-- config/
|   |   |-- controllers/
|   |   |-- middleware/
|   |   |-- models/
|   |   |-- routes/
|   |   |-- services/
|   |   |-- utils/
|   |   `-- validators/
|   `-- .env.example
`-- README.md
```

## Core Product Flow

1. A user signs up or logs in.
2. A creator builds a poll with one or more questions, selects anonymous or authenticated voting, and can optionally set an expiry date.
3. Respondents open the poll link and submit answers.
4. The backend validates the payload, checks expiry, checks duplicate votes, stores the response, and emits a room-scoped realtime analytics update.
5. The creator sees private analytics until they publish results.
6. After publish, the same `/poll/:id` link becomes a live public results experience, while `/poll/:id/results` remains the dedicated analytics route.

## Realtime Model

PollBoard avoids global broadcasts. Every live view joins a poll-specific room.

- Client event: `poll:join`
- Client event: `poll:leave`
- Server event: `poll:results-updated`
- Server event: `poll:presence-updated`
- Optional server event: `poll:responded`

Server room pattern:

```js
socket.join(`poll:${pollId}`);
io.to(`poll:${pollId}`).emit("poll:results-updated", payload);
```

This keeps traffic scoped to the poll being viewed and prevents unrelated dashboards from rerendering.

## Analytics Features

- Total responses
- Question-by-question option counts
- Participation rate per question
- Anonymous vs authenticated response split
- Response trend buckets
- Most selected option
- Least selected option
- Live viewer count for active poll rooms
- CSV export
- Print-friendly analytics layout

## API Overview

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Polls

- `GET /api/polls/recent`
- `GET /api/polls`
- `GET /api/polls/my-polls` `auth required`
- `POST /api/polls` `auth required`
- `GET /api/polls/:pollId`
- `POST /api/polls/:pollId/vote`
- `GET /api/polls/:pollId/results`
- `PATCH /api/polls/:pollId/publish` `owner only`

### Response Envelope

The backend keeps a shared response shape:

- `success`
- `statusCode`
- `message`
- `data`

## Anonymous Vote Protection

Anonymous polls use a browser/device token to reduce duplicate voting.

- The client stores a stable token in `localStorage`
- Vote submissions send it in the `x-pollboard-voter-token` header
- The backend hashes the token before persistence
- A unique MongoDB partial index prevents duplicate anonymous responses per poll

This is intentionally browser/device scoped, not cross-device identity proofing.

## Environment Variables

### Server

```env
PORT=8080
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/pollboard

# Preferred JWT names
JWT_ACCESS_SECRET=replace_me
JWT_REFRESH_SECRET=replace_me
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Backward-compatible aliases still supported
# ACCESS_TOKEN_SECRET=replace_me
# REFRESH_TOKEN_SECRET=replace_me
# ACCESS_TOKEN_EXPIRES_IN=15m
# REFRESH_TOKEN_EXPIRES_IN=7d

CLIENT_URL=http://localhost:5173
# Or comma-separated:
# CLIENT_URLS=http://localhost:5173,http://127.0.0.1:5173

RATE_LIMIT_MAX=200
AUTH_RATE_LIMIT_MAX=20
VOTE_RATE_LIMIT_MAX=60
```

### Client

```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_SOCKET_URL=http://localhost:8080
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

### 2. Create environment files

Copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env`.

### 3. Start the backend

```bash
cd server
npm run dev
```

### 4. Start the frontend

```bash
cd client
npm run dev
```

## Deployment Notes

### Frontend

- Build command: `npm run build`
- Output directory: `dist`
- Set `VITE_API_BASE_URL` to your deployed backend API
- Set `VITE_SOCKET_URL` to your deployed backend root

### Backend

- Start command: `npm run dev`
- Configure MongoDB, JWT secrets, allowed client origins, and rate limits
- Keep WebSocket support enabled on the hosting platform

### MongoDB

- Create the cluster and database user
- Allow access from your deployment environment
- Add the connection string to `MONGO_URI`

## Suggested Screenshots

If you are packaging this for a submission or portfolio entry, capture:

- `docs/screenshots/home.png`
- `docs/screenshots/create-poll.png`
- `docs/screenshots/dashboard.png`
- `docs/screenshots/published-results.png`

## Verification Commands

```bash
cd server && npm run lint
cd client && npm run lint
cd client && npm run build
```

## Notes

- Poll expiry is enforced lazily on read, vote, and publish actions. No background scheduler is required.
- Older poll documents remain supported through serializer defaults rather than destructive migrations.
- The current implementation keeps the existing controller/service route structure and extends it incrementally instead of replacing the architecture.