# Testing

## Backend (JUnit 5, Spring Boot Test, Testcontainers)

**Location:** `backend/src/test/java/com/sonic/`

The integration tests start the whole application against a real PostgreSQL in Docker (Testcontainers), and call it over HTTP with MockMvc. Requests go through the real security chain and user provisioning. Only two things are stubbed:

- the JWT decoder, so tests don't need Clerk. A request sent with `as(clerkId)` carries the token `test.<clerkId>`.
- the two AI interfaces (`VoiceParser`, `InsightGenerator`), so tests never call the AI provider.

| Test class | Covers |
|---|---|
| `workout/WorkoutApiTest` | Auth required, nested create with ordering, zero values kept, pagination, per-user isolation, validation errors, user provisioning |
| `metric/BodyMetricAndDraftApiTest` | Body metric create/list and validation; draft save/replace/clear |
| `voice/VoiceLogApiTest` | Text voice logs saving workouts and metrics, "not understood" responses, validating model output, past-date measurements, audio upload (transcribed, then parsed), silent recordings |
| `voice/AiSchemaTest` | The JSON schema given to the model keeps unsaid values optional, so the model can't be forced to invent them |
| `voice/VoiceReviewApiTest` | Parse returns an unsaved draft; confirm saves the edited version with canonical names; past-day workouts are dated that day; the AI gets the user's unit and exercise names; "5 sets of 5" written once is expanded |
| `workout/RecordsApiTest` | Weight, estimated 1-rep max and bodyweight-rep records (none on the first session); all-time bests per exercise; editing a workout, and only your own |
| `export/ExportApiTest` | CSV rows per set in the user's unit and time zone, safe quoting of notes, only your own data |
| `common/AiErrorsTest` | Rate limits and rejected keys get their own problem types |
| `insight/InsightApiTest` | 3-workout minimum, SQL aggregates (volume, cardio, top exercises, 90-day window, weight change), 24h cooldown with `Retry-After`, same-day sessions, rejecting incomplete model output |

Run them (Docker must be running):

```bash
cd backend
./mvnw test
```

## Frontend (Vitest)

**Location:** `frontend/src/lib/__tests__/`

- `summary.test.ts`: volume, cardio duration and session counts
- `stats.test.ts`: weekly totals, streaks, the activity grid, exercise progress and body trends
- `units.test.ts`: kg/lb conversion and rounding, picking recent distinct workouts
- `WorkoutEditor.test.tsx`: editing in pounds and minutes saves kg and hours; validation messages
- `logFlow.test.tsx`: speak → review → save shows personal records; repeating a recent workout
- `pages.test.tsx` and `useVoiceCapture.test.ts`: page rendering, Brave and remembered voice modes

```bash
cd frontend
npm test              # watch mode
npx vitest run        # single run
npm run test:coverage
```

## CI

`.github/workflows/ci.yml` runs both suites, the frontend lint and type check, and both builds on every push and pull request.
