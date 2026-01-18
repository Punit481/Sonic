import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";

export const logMetrics = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.authUserId) {
      res.status(401).json({ message: "User not authenticated!" });
      return;
    }

    const { date, weight, bodyFat, muscleMass } = req.body;

    if (!weight && !bodyFat && !muscleMass) {
      res.status(400).json({
        message:
          "At least one metric (weight, bodyFat, or muscleMass) is required!",
      });
      return;
    }

    const newMetric = await prisma.bodyMetric.create({
      data: {
        userId: req.authUserId,
        date: date ? new Date(date) : new Date(),
        weight: weight ? parseFloat(weight) : null,
        bodyFat: bodyFat ? parseFloat(bodyFat) : null,
        muscleMass: muscleMass ? parseFloat(muscleMass) : null,
      },
      select: {
        id: true,
        date: true,
        weight: true,
        bodyFat: true,
        muscleMass: true,
      },
    });

    res.status(201).json({
      message: "Metrics logged successfully!",
      metric: newMetric,
    });
  } catch (error) {
    console.error("Error logging body metrics:", error);
    res.status(500).json({
      message: "Failed to log metrics!",
      error: error,
    });
  }
};

export const getMetrics = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.authUserId) {
      res.status(401).json({ message: "User not authenticated!" });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const totalCount = await prisma.bodyMetric.count({
      where: { userId: req.authUserId },
    });

    const metrics = await prisma.bodyMetric.findMany({
      where: {
        userId: req.authUserId,
      },
      orderBy: {
        date: "desc",
      },
      skip,
      take: limit,
      select: {
        id: true,
        date: true,
        weight: true,
        bodyFat: true,
        muscleMass: true,
      },
    });

    const response = {
      metrics,
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
      message: "Metrics retrieved successfully!",
      data: response,
    });
  } catch (error) {
    console.error("Error fetching body metrics:", error);
    res.status(500).json({
      message: "Failed to fetch metrics!",
      error: error,
    });
  }
};
