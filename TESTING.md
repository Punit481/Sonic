# Testing Documentation

## Overview

This document describes the testing setup for the Sonic workout logging application.

## Test Coverage

### Client Tests (Vitest)

**Location**: `client/src/lib/__tests__/`

#### Summary Utils (`summary.test.ts`)

- ✅ 12 tests covering:
  - `getVolume()` - Calculate total workout volume
  - `getCardioDuration()` - Calculate cardio duration
  - `getSessionCount()` - Count workout sessions

#### Charts Utils (`charts.test.ts`)

- ✅ 8 tests covering:
  - `filterByTimeRange()` - Date range filtering
  - `transformMetricsForChart()` - Data transformation for charts

**Total Client Tests**: 20 passing

### Server Tests (Jest + Supertest)

**Location**: `server/src/__tests__/integration/`

#### Logs API (`logs.test.ts`)

- ✅ 6 tests covering:
  - `POST /api/logs` - Create workout logs
  - `GET /api/logs` - Fetch workout logs with pagination
  - `POST /api/logs/save` - Save workout data
  - `GET /api/logs/saved` - Fetch saved data

**Total Server Tests**: 6 passing

## Running Tests

### Client

```bash
cd client
npm test              # Run tests
npm test -- --ui      # Run with UI
npm run test:coverage # Run with coverage
```

### Server

```bash
cd server
npm test              # Run tests
npm run test:watch    # Run in watch mode
npm run test:coverage # Run with coverage
```

### All Tests

```bash
# From root
cd client && npm test -- --run && cd ../server && npm test
```

## CI/CD Pipeline

### GitHub Actions

**Location**: `.github/workflows/ci.yml`

The CI pipeline runs on every push and pull request:

1. **Client Jobs**:

   - Install dependencies
   - Run linter
   - Run tests
   - Build application

2. **Server Jobs**:
   - Install dependencies
   - Setup PostgreSQL database
   - Run Prisma migrations
   - Run tests
   - Build application

### Running Locally

Tests run automatically on:

- Every push to `main` or `develop`
- Every pull request to `main`

## Test Structure

### Client Test Pattern

```typescript
import { describe, it, expect } from "vitest";

describe("Feature Name", () => {
  it("should do something", () => {
    // Arrange
    const input = "test";

    // Act
    const result = myFunction(input);

    // Assert
    expect(result).toBe("expected");
  });
});
```

### Server Test Pattern

```typescript
import request from "supertest";

describe("API Endpoint", () => {
  it("should return 200", async () => {
    const response = await request(app)
      .get("/api/endpoint")
      .send({ data: "test" });

    expect(response.status).toBe(200);
  });
});
```

## Future Testing TODO

### High Priority

- [ ] Add integration tests for metrics API
- [ ] Add tests for voice log processing
- [ ] Add tests for Gemini AI integration

### Medium Priority

- [ ] E2E tests for critical user journeys
- [ ] Component tests for React components
- [ ] Performance tests for data processing

### Low Priority

- [ ] Visual regression tests
- [ ] Load testing
- [ ] Security testing

## Coverage Goals

- Unit Tests: 70%+ coverage of business logic
- Integration Tests: All API endpoints
- E2E Tests: Critical user flows only (due to time constraints)

## Notes

- Tests use mocked Prisma client for database operations
- Authentication is mocked in integration tests
- All tests should be independent and idempotent
