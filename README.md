# Sonic - SPEAK IT, LOG IT

**Focus on your form, not your phone.**

Sonic lets you log workouts just by speaking. No typing, no fumbling with your phone between sets - just talk naturally about your workout and let our AI handle the rest.

## How Sonic Works

**From voice to insight in seconds**

### Step 1: Speak Your Workout

Just talk naturally about your exercises, sets, and reps. No typing required.
_"I did bench press today, 3 sets of 8 reps at 185 pounds"_

### Step 2: Structured And Stored

Our AI instantly converts your speech into structured workout data and saves it securely.

### Step 3: Get Insights

View every metric and receive smart AI suggestions to improve your training.

---

## Architecture

```
frontend/  React + TypeScript (Vite)  ──HTTPS + Clerk JWT──▶  backend/  Spring Boot (Java 25)
                                                                 │
                                                  ┌──────────────┼───────────────┐
                                                  ▼              ▼               ▼
                                             PostgreSQL    Groq: gpt-oss +    Clerk JWKS
                                           (JDBC + Flyway)  Whisper (Spring AI) (token checks)
```

### Backend (`backend/`)

Spring Boot 4 on Java 25, built with Maven. Code is grouped by feature:

```
backend/src/main/java/com/sonic/
├── SonicApplication.java
├── config/      SonicProperties (sonic.* settings), Clock and OpenAPI setup
├── security/    Clerk JWT verification, user provisioning, CORS
├── common/      Problem-detail errors, paging, per-user AI rate limiting
├── user/        GET /api/v1/me
├── workout/     Workouts, exercises and sets (JDBC repository, nested batch inserts)
├── metric/      Body measurements
├── draft/       Saved, not-yet-logged transcript
├── voice/       Voice logging: Whisper transcribes audio, gpt-oss turns text into workouts and metrics
└── insight/     Coaching insights: SQL aggregation + gpt-oss, with a 24h cooldown
backend/src/main/resources/
├── application.yml
├── db/migration/V1__init.sql   Flyway schema
└── prompts/                    Prompt templates
```

- **Data access:** plain SQL through Spring's `JdbcClient`, no ORM. Schema changes are Flyway migrations.
- **Auth:** the frontend signs in with Clerk. The API verifies Clerk's JWT (signature, expiry, issuer and the `azp` origin) and creates the user row on their first request.
- **AI:** [Groq](https://groq.com)'s free tier through Spring AI's OpenAI client (Groq's API is OpenAI-compatible). Whisper turns recordings into text; OpenAI's open-weight gpt-oss-120b turns text into workouts and writes insights, following a JSON schema generated from Java records. The model's output is validated like any request body before it is saved. Any OpenAI-compatible provider works by changing `spring.ai.openai.base-url` and the model names.
- **Errors:** every error is an [RFC 7807](https://www.rfc-editor.org/rfc/rfc7807) `application/problem+json` response with a stable `type`.

### Frontend (`frontend/`)

React 19, TypeScript, Vite, Tailwind, Zustand, Recharts and Clerk. All API calls live in `frontend/src/lib/api.ts`.

## API

Interactive docs run at `http://localhost:8080/swagger-ui` while the backend is running. Every endpoint except health and docs needs `Authorization: Bearer <Clerk session token>`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/me` | Current user, including `isPremium` |
| GET | `/api/v1/workouts?page=1&size=20` | Workouts, newest first (size ≤ 100) |
| POST | `/api/v1/workouts` | Log a workout |
| GET / DELETE | `/api/v1/workouts/{id}` | One workout |
| GET | `/api/v1/body-metrics?page=1&size=50` | Body measurements, newest first |
| POST | `/api/v1/body-metrics` | Log a measurement |
| DELETE | `/api/v1/body-metrics/{id}` | Delete a measurement |
| GET / PUT / DELETE | `/api/v1/workout-draft` | The saved transcript |
| POST | `/api/v1/voice-logs` | `{ transcript, timeZone }` → saved workout and/or measurement |
| POST | `/api/v1/voice-logs/audio` | Multipart `file` (audio) → transcribed and saved in one call. Used when the browser has no speech recognition |
| GET | `/api/v1/insights/latest` | Latest insights and whether new ones can be generated |
| POST | `/api/v1/insights` | Generate insights (needs 3+ workouts, once per 24h) |
| GET | `/actuator/health` | Health check (no auth) |

Units: weights in kg, distances in km, durations in hours. Voice and insight endpoints are limited to 30 AI calls per user per hour by default.

## Getting Started

### What you'll need

- Java 25 (any JDK 25 or newer; the Maven wrapper downloads Maven itself)
- Node.js 20+ and npm
- Docker, for the local Postgres database (or your own PostgreSQL 14+)
- A [Clerk](https://clerk.com) application
- A free [Groq](https://console.groq.com/keys) API key (no card needed)

### 1. Configure Clerk

In the Clerk dashboard, open **Sessions → Customize session token** and add:

```json
{
  "email": "{{user.primary_email_address}}",
  "name": "{{user.first_name}}"
}
```

The API reads these claims when it creates a user. Without them it falls back to Clerk's Backend API, which needs `CLERK_SECRET_KEY` set on the backend.

### 2. Run the backend

```bash
cd backend
cp .env.example .env      # then fill in CLERK_ISSUER and GROQ_API_KEY
./mvnw spring-boot:run
```

`spring-boot:run` starts Postgres from `compose.yaml` automatically and Flyway creates the tables. The API listens on `http://localhost:8080`.

### 3. Run the frontend

```bash
cd frontend
cp .env.example .env      # set VITE_CLERK_PUBLISHABLE_KEY
npm install
npm run dev
```

Open `http://localhost:5173`.

## Deployment

- **Backend:** `backend/Dockerfile` builds a container image. Run it on any container host (Render, Railway, Fly.io, a VPS) with the variables from `backend/.env.example`. Set `SONIC_ALLOWED_ORIGINS` to your frontend's URL and `LOG_FORMAT=ecs` for JSON logs.
- **Frontend:** deploy `frontend/` to Vercel as before. If the Vercel project's root directory was `client`, change it to `frontend`. Set `VITE_BACKEND_URL` to the backend's URL.

## Testing

See [TESTING.md](TESTING.md).

## Want to Contribute?

**Found a bug? Have a cool idea? I'd love your help!**

1. Fork this repo
2. Create your feature branch (`git checkout -b feature/awesome-feature`)
3. Make your changes and test them
4. Commit with a clear message (`git commit -m 'feat: add awesome feature'`)
5. Push to your branch (`git push origin feature/awesome-feature`)
6. Open a Pull Request and tell us what you built!

## License

This project is MIT licensed. Basically, do what you want with it.
