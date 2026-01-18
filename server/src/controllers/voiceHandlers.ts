import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import type { WorkoutSession, BodyMetric } from "@prisma/client";
import {
  callStructuredGemini,
  validateSchema,
  isUnifiedVoiceLogResponse,
  isStructuredGeminiError,
  isSchemaValidationError,
} from "../utils/structuredGemini";
import {
  unifiedVoiceLogSchema,
  unifiedVoicePrompt,
} from "../utils/geminiSchemas";

export async function handleUnifiedVoiceLog(
  req: AuthenticatedRequest,
  res: Response,
  transcript: string
): Promise<void> {
  try {
    const voiceData = await callStructuredGemini(
      unifiedVoicePrompt(transcript),
      unifiedVoiceLogSchema
    );

    const validatedData = validateSchema(
      voiceData,
      isUnifiedVoiceLogResponse,
      "unified voice log"
    );

    const results = {
      workout: null as { message: string; session: WorkoutSession } | null,
      metric: null as { message: string; metric: BodyMetric } | null,
      errors: [] as string[],
    };

    // Process workout data if present
    if (
      validatedData.workout?.exercises &&
      validatedData.workout.exercises.length > 0
    ) {
      try {
        const newSession = await prisma.workoutSession.create({
          data: {
            userId: req.authUserId!,
            date: new Date(),
            duration: validatedData.workout.duration || null,
            note: validatedData.workout.note || null,
            exercises: {
              create: validatedData.workout.exercises.map((exercise) => ({
                name: exercise.name,
                category: exercise.category,
                isCustom: exercise.isCustom || false,
                aiTagged: true,
                sets: {
                  create: exercise.sets.map((set) => ({
                    reps: set.reps || null,
                    weight: set.weight || null,
                    distance: set.distance || null,
                    duration: set.duration || null,
                    intensity: set.intensity || null,
                    note: set.note || null,
                  })),
                },
              })),
            },
          },
          include: {
            exercises: {
              include: {
                sets: true,
              },
            },
          },
        });

        results.workout = { message: "Workout logged!", session: newSession };
      } catch (error) {
        console.error("Error creating workout log:", error);
        results.errors.push("Failed to create workout log");
      }
    }

    // Process body metrics if present
    if (
      validatedData.bodyMetrics &&
      (validatedData.bodyMetrics.weight ||
        validatedData.bodyMetrics.bodyFat ||
        validatedData.bodyMetrics.muscleMass)
    ) {
      try {
        const newMetric = await prisma.bodyMetric.create({
          data: {
            userId: req.authUserId!,
            date: validatedData.bodyMetrics.date
              ? new Date(validatedData.bodyMetrics.date)
              : new Date(),
            weight: validatedData.bodyMetrics.weight
              ? parseFloat(validatedData.bodyMetrics.weight.toString())
              : null,
            bodyFat: validatedData.bodyMetrics.bodyFat
              ? parseFloat(validatedData.bodyMetrics.bodyFat.toString())
              : null,
            muscleMass: validatedData.bodyMetrics.muscleMass
              ? parseFloat(validatedData.bodyMetrics.muscleMass.toString())
              : null,
          },
        });

        results.metric = { message: "Body metrics logged!", metric: newMetric };
      } catch (error) {
        console.error("Error creating body metric:", error);
        results.errors.push("Failed to create body metric");
      }
    }

    // Handle case where nothing was extracted
    if (!results.workout && !results.metric && results.errors.length === 0) {
      res.status(400).json({
        success: false,
        error: "Could not understand the input. Please try again.",
        suggestion:
          "Try saying something like: 'I did bench press, 3 sets of 8 reps at 185 pounds' or 'I weigh 175 pounds today'",
      });
      return;
    }

    if (results.errors.length > 0 && !results.workout && !results.metric) {
      res.status(500).json({
        success: false,
        error: "Failed to process voice input",
        errors: results.errors,
      });
    } else {
      res.json({
        success: results.errors.length === 0,
        message: "Voice input processed successfully",
        session: results?.workout?.session,
        metric: results?.metric?.metric,
        errors: results.errors.length > 0 ? results.errors : undefined,
      });
    }
  } catch (error) {
    console.error("Error processing voice input:", error);

    if (isStructuredGeminiError(error) || isSchemaValidationError(error)) {
      res.status(400).json({
        success: false,
        error: "Failed to understand the input",
        suggestion: "Please try rephrasing your input more clearly",
        details: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to process voice input",
      });
    }
  }
}
