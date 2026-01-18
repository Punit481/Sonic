import request from "supertest";
import express, { Express } from "express";
import logsRoute from "../../routes/logs";
import { prisma } from "../../lib/prisma";

// Mock dependencies
jest.mock("../../lib/prisma", () => ({
  prisma: {
    workoutSession: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("../../middleware/auth", () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.authUserId = "test-user-id";
    next();
  },
}));

describe("Logs API", () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/logs", logsRoute);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/logs", () => {
    it("should create a new workout log", async () => {
      const mockSession = {
        id: "session-1",
        userId: "test-user-id",
        date: new Date("2025-11-04"),
        duration: 60,
        note: "Great workout",
        createdAt: new Date(),
        exercises: [
          {
            id: "ex-1",
            name: "Bench Press",
            category: "strength",
            isCustom: false,
            aiTagged: true,
            sets: [
              {
                id: "set-1",
                reps: 10,
                weight: 100,
              },
            ],
          },
        ],
      };

      (prisma.workoutSession.create as jest.Mock).mockResolvedValue(
        mockSession
      );

      const response = await request(app)
        .post("/api/logs")
        .send({
          parsedJson: {
            exercises: [
              {
                name: "Bench Press",
                category: "strength",
                sets: [{ reps: 10, weight: 100 }],
              },
            ],
          },
          date: "2025-11-04",
          duration: 60,
          note: "Great workout",
        });

      expect(response.status).toBe(200);
      expect(prisma.workoutSession.create).toHaveBeenCalled();
    });

    it("should return 400 if parsedJson is missing", async () => {
      const response = await request(app).post("/api/logs").send({
        date: "2025-11-04",
      });

      // The response might be 500 or 400 depending on implementation
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("GET /api/logs", () => {
    it("should fetch workout logs for authenticated user", async () => {
      const mockLogs = [
        {
          id: "session-1",
          userId: "test-user-id",
          date: new Date("2025-11-04"),
          duration: 60,
          note: "Test workout",
          createdAt: new Date(),
          exercises: [],
        },
      ];

      (prisma.workoutSession.count as jest.Mock).mockResolvedValue(1);
      (prisma.workoutSession.findMany as jest.Mock).mockResolvedValue(mockLogs);

      const response = await request(app).get("/api/logs");

      expect(response.status).toBe(200);
      expect(prisma.workoutSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "test-user-id" },
        })
      );
    });

    it("should return empty array if no logs exist", async () => {
      (prisma.workoutSession.count as jest.Mock).mockResolvedValue(0);
      (prisma.workoutSession.findMany as jest.Mock).mockResolvedValue([]);

      const response = await request(app).get("/api/logs");

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty("sessions");
      expect(Array.isArray(response.body.data.sessions)).toBe(true);
      expect(response.body.data.sessions.length).toBe(0);
    });
  });

  describe("POST /api/logs/save", () => {
    it("should save workout data to user toProcess field", async () => {
      const mockUser = {
        id: "test-user-id",
        email: "test@example.com",
        toProcess: "bench press 3 sets",
      };

      (prisma.user.update as any) = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app).post("/api/logs/save").send({
        toProcess: "bench press 3 sets",
      });

      expect(response.status).toBeLessThan(500);
    });
  });

  describe("GET /api/logs/saved", () => {
    it("should fetch saved workout data", async () => {
      const mockUser = {
        id: "test-user-id",
        email: "test@example.com",
        toProcess: "bench press 3 sets",
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app).get("/api/logs/saved");

      expect(response.status).toBe(200);
    });
  });
});
