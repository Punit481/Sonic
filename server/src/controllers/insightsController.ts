import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import {
  callStructuredGemini,
  validateSchema,
  isInsightsResponse,
} from "../utils/structuredGemini";
import { insightsSchema, createInsightsPrompt } from "../utils/geminiSchemas";

// Helper function to aggregate user workout data
async function aggregateUserData(userId: string) {
  const now = new Date();
  const daysAgo = (days: number) =>
    new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Fetch last 90 days of workout sessions
  const sessions = await prisma.workoutSession.findMany({
    where: {
      userId,
      date: {
        gte: daysAgo(90),
      },
    },
    include: {
      exercises: {
        include: {
          sets: true,
        },
      },
    },
    orderBy: {
      date: "desc",
    },
  });

  if (sessions.length === 0) {
    throw new Error(
      "Not enough workout data to generate insights. Please log at least a few workouts first."
    );
  }

  // Calculate training period
  const oldestSession = sessions[sessions.length - 1];
  const trainingPeriodDays = Math.ceil(
    (now.getTime() - new Date(oldestSession.date).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  // Calculate total volume (kg lifted)
  let totalVolume = 0;
  let totalCardioDuration = 0;
  const exerciseDistribution = { strength: 0, cardio: 0, mobility: 0 };
  const exerciseFrequency: Record<string, { count: number; category: string }> =
    {};

  sessions.forEach((session) => {
    session.exercises.forEach((exercise) => {
      // Count exercise frequency
      const exerciseName = exercise.name.toLowerCase();
      if (!exerciseFrequency[exerciseName]) {
        exerciseFrequency[exerciseName] = {
          count: 0,
          category: exercise.category,
        };
      }
      exerciseFrequency[exerciseName].count++;

      // Track exercise distribution
      if (exercise.category === "strength") {
        exerciseDistribution.strength++;
      } else if (exercise.category === "cardio") {
        exerciseDistribution.cardio++;
      } else if (exercise.category === "mobility") {
        exerciseDistribution.mobility++;
      }

      // Calculate volume and duration
      exercise.sets.forEach((set) => {
        if (set.weight && set.reps) {
          totalVolume += set.weight * set.reps;
        }
        if (set.duration && exercise.category === "cardio") {
          totalCardioDuration += set.duration;
        }
      });
    });
  });

  // Get top exercises by frequency
  const topExercises = Object.entries(exerciseFrequency)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 5)
    .map(([name, data]) => ({
      name,
      count: data.count,
      category: data.category,
    }));

  // Calculate recent weeks comparison
  const twoWeeksAgo = daysAgo(14);
  const fourWeeksAgo = daysAgo(28);
  const recentSessions = sessions.filter(
    (s) => new Date(s.date) >= twoWeeksAgo
  ).length;
  const previousSessions = sessions.filter(
    (s) => new Date(s.date) >= fourWeeksAgo && new Date(s.date) < twoWeeksAgo
  ).length;

  // Fetch body metrics
  const metrics = await prisma.bodyMetric.findMany({
    where: {
      userId,
      date: {
        gte: daysAgo(90),
      },
    },
    orderBy: {
      date: "desc",
    },
  });

  let bodyMetrics = undefined;
  if (metrics.length >= 2) {
    const latest = metrics[0];
    const oldest = metrics[metrics.length - 1];

    const weightChange =
      latest.weight && oldest.weight
        ? `${latest.weight.toFixed(1)}kg (${latest.weight > oldest.weight ? "+" : ""}${(latest.weight - oldest.weight).toFixed(1)}kg)`
        : undefined;

    const bodyFatChange =
      latest.bodyFat && oldest.bodyFat
        ? `${latest.bodyFat.toFixed(1)}% (${latest.bodyFat > oldest.bodyFat ? "+" : ""}${(latest.bodyFat - oldest.bodyFat).toFixed(1)}%)`
        : undefined;

    const muscleMassChange =
      latest.muscleMass && oldest.muscleMass
        ? `${latest.muscleMass.toFixed(1)}kg (${latest.muscleMass > oldest.muscleMass ? "+" : ""}${(latest.muscleMass - oldest.muscleMass).toFixed(1)}kg)`
        : undefined;

    bodyMetrics = {
      weightChange,
      bodyFatChange,
      muscleMassChange,
      hasData: true,
    };
  }

  return {
    trainingPeriodDays,
    totalSessions: sessions.length,
    avgSessionsPerWeek: (sessions.length / trainingPeriodDays) * 7,
    totalVolume,
    totalCardioDuration,
    exerciseDistribution,
    topExercises,
    recentWeeksComparison: {
      current: recentSessions,
      previous: previousSessions,
    },
    bodyMetrics,
  };
}

export const generateInsights = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.authUserId) {
      res.status(401).json({ message: "User not authenticated!" });
      return;
    }

    // Check if user has recent insights (less than 24 hours old)
    const existingInsight = await prisma.userInsight.findFirst({
      where: {
        userId: req.authUserId,
      },
      orderBy: {
        generatedAt: "desc",
      },
    });

    if (existingInsight) {
      const now = new Date();
      const canRegenerateAfter = new Date(existingInsight.canRegenerateAfter);

      if (now < canRegenerateAfter) {
        const hoursRemaining = Math.ceil(
          (canRegenerateAfter.getTime() - now.getTime()) / (1000 * 60 * 60)
        );

        res.status(429).json({
          message: `Please wait ${hoursRemaining} hour${hoursRemaining > 1 ? "s" : ""} before generating new insights.`,
          canRegenerateAt: canRegenerateAfter,
          insights: {
            summary: existingInsight.summary,
            achievements: existingInsight.achievements,
            trends: existingInsight.trends,
            recommendations: existingInsight.recommendations,
            warnings: existingInsight.warnings,
            nextSteps: existingInsight.nextSteps,
            generatedAt: existingInsight.generatedAt,
          },
        });
        return;
      }
    }

    // Aggregate user data
    const userData = await aggregateUserData(req.authUserId);

    // Generate prompt
    const prompt = createInsightsPrompt(userData);

    // Call Gemini API
    const insightsData = await callStructuredGemini(prompt, insightsSchema);

    // Validate response
    const validatedInsights = validateSchema(
      insightsData,
      isInsightsResponse,
      "insights"
    );

    const now = new Date();
    const canRegenerateAfter = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Store insights in database
    const savedInsight = await prisma.userInsight.create({
      data: {
        userId: req.authUserId,
        summary: validatedInsights.summary,
        achievements: validatedInsights.achievements,
        trends: validatedInsights.trends,
        recommendations: validatedInsights.recommendations,
        warnings: validatedInsights.warnings,
        nextSteps: validatedInsights.nextSteps,
        canRegenerateAfter,
      },
    });

    res.status(200).json({
      message: "Insights generated successfully!",
      insights: {
        summary: savedInsight.summary,
        achievements: savedInsight.achievements,
        trends: savedInsight.trends,
        recommendations: savedInsight.recommendations,
        warnings: savedInsight.warnings,
        nextSteps: savedInsight.nextSteps,
        generatedAt: savedInsight.generatedAt,
      },
      canRegenerateAt: canRegenerateAfter,
    });
  } catch (error: any) {
    console.error("Error generating insights:", error);

    if (error.message && error.message.includes("Not enough workout data")) {
      res.status(400).json({
        message: error.message,
        error: error,
      });
    } else {
      res.status(500).json({
        message: "Failed to generate insights!",
        error: error.message || "Unknown error",
      });
    }
  }
};

export const getInsights = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.authUserId) {
      res.status(401).json({ message: "User not authenticated!" });
      return;
    }

    // Check if user has enough data
    const sessionCount = await prisma.workoutSession.count({
      where: { userId: req.authUserId },
    });

    if (sessionCount < 3) {
      res.status(200).json({
        message: "Not enough data yet",
        insights: null,
        canRegenerate: false,
      });
      return;
    }

    // Get the most recent insight from database
    const latestInsight = await prisma.userInsight.findFirst({
      where: {
        userId: req.authUserId,
      },
      orderBy: {
        generatedAt: "desc",
      },
    });

    if (!latestInsight) {
      res.status(200).json({
        message: "No insights yet. Generate your first insights!",
        insights: null,
        canRegenerate: true,
      });
      return;
    }

    const now = new Date();
    const canRegenerateAfter = new Date(latestInsight.canRegenerateAfter);
    const canRegenerate = now >= canRegenerateAfter;

    res.status(200).json({
      message: "Insights retrieved successfully!",
      insights: {
        summary: latestInsight.summary,
        achievements: latestInsight.achievements,
        trends: latestInsight.trends,
        recommendations: latestInsight.recommendations,
        warnings: latestInsight.warnings,
        nextSteps: latestInsight.nextSteps,
        generatedAt: latestInsight.generatedAt,
      },
      canRegenerate,
      canRegenerateAt: canRegenerateAfter,
    });
  } catch (error) {
    console.error("Error fetching insights:", error);
    res.status(500).json({
      message: "Failed to fetch insights!",
      error: error,
    });
  }
};
