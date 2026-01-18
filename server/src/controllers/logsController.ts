import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";

import { WorkoutSession } from "../types/workout.types";

export const createLog = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.authUserId) {
      res.json({ message: "User not authenticated!" });
      return;
    }

    const requestData: WorkoutSession = req.body;

    const { parsedJson, date, duration, note } = requestData;

    const newSession = await prisma.workoutSession.create({
      data: {
        userId: req.authUserId,
        date: date ? new Date(date) : new Date(),
        duration: duration || null,
        note: note || null,
        exercises: {
          create: parsedJson.exercises.map((exercise) => ({
            name: exercise.name,
            category: exercise.category,
            isCustom: exercise.isCustom || false,
            aiTagged: false,
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
    res.json({ message: "Session Logged!", session: newSession });
  } catch (error) {
    console.error("Error creating workout log:", error);
    res.status(500).json({ message: "Failed to create a log!", error: error });
  }
};

export const getLogs = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.authUserId) {
      res.json({ message: "User not authenticated!" });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const totalCount = await prisma.workoutSession.count({
      where: { userId: req.authUserId },
    });

    const sessions = await prisma.workoutSession.findMany({
      where: { userId: req.authUserId },
      include: {
        exercises: {
          include: {
            sets: true,
          },
        },
      },
      orderBy: { date: "desc" },
      skip,
      take: limit,
    });

    const response = {
      sessions,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1,
      },
    };

    res.json({
      message: "Logs retrieved successfully!",
      data: response,
    });
  } catch (error) {
    console.error("Error fetching workout logs:", error);
    res.status(500).json({
      message: "Failed to fetch logs!",
      error: error,
    });
  }
};

export const saveLog = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.authUserId) {
      res.json({ message: "User not authenticated!" });
      return;
    }

    const { data } = req.body;
    await prisma.user.update({
      where: {
        id: req.authUserId,
      },
      data: {
        toProcess: data,
      },
    });
    res.json({ message: "Workout Saved!" });
  } catch (error) {
    console.error("Error saving log:", error);
    res.status(500).json({ message: "Failed to create a log!", error: error });
  }
};

export const getSavedLog = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.authUserId) {
      res.json({ message: "User not authenticated!" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: {
        id: req.authUserId,
      },
    });
    res.json({ message: "Workout Saved!", toProcess: user?.toProcess });
  } catch (error) {
    console.error("Error saving log:", error);
    res.status(500).json({ message: "Failed to create a log!", error: error });
  }
};
