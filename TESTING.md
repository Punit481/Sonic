# Testing

## Backend (JUnit 5, Spring Boot Test, Testcontainers)

**Location:** `backend/src/test/java/com/sonic/`

The integration tests start the whole application against a real PostgreSQL in Docker (Testcontainers), and call it over HTTP with MockMvc. Requests go through the real security chain and user provisioning. Only two things are stubbed:

- the JWT decoder, so tests don't need Clerk. A request sent with `as(clerkId)` carries the token `test.<clerkId>`.
- the two AI interfaces (`VoiceParser`, `InsightGenerator`), so tests never call Gemini.

| Test class | Covers |
|---|---|
| `workout/WorkoutApiTest` | Auth required, nested create with ordering, zero values kept, pagination, per-user isolation, validation errors, user provisioning |
| `metric/BodyMetricAndDraftApiTest` | Body metric create/list and validation; draft save/replace/clear |
| `voice/VoiceLogApiTest` | Text voice logs saving workouts and metrics, "not understood" responses, validating model output, past-date measurements, audio upload |
| `voice/GeminiSchemaTest` | The JSON schema sent to Gemini keeps unsaid values optional, so the model can't be forced to invent them |
| `insight/InsightApiTest` | 3-workout minimum, SQL aggregates (volume, cardio, top exercises, 90-day window, weight change), 24h cooldown with `Retry-After`, same-day sessions, rejecting incomplete model output |

Run them (Docker must be running):

```bash
cd backend
./mvnw test
```

## Frontend (Vitest)

**Location:** `frontend/src/lib/__tests__/`

- `summary.test.ts`: volume, cardio duration and session counts
- `charts.test.ts`: date-range filtering and chart data transformation

```bash
cd frontend
npm test              # watch mode
npx vitest run        # single run
npm run test:coverage
```

## CI

`.github/workflows/ci.yml` runs both suites, the frontend lint and type check, and both builds on every push and pull request.
