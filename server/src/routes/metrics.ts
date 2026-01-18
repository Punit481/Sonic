import express from "express";
import { requireAuth } from "../middleware/auth";
import { getMetrics, logMetrics } from "../controllers/metricsController";

const router = express.Router();

router.post("/", requireAuth, logMetrics);
router.get("/", requireAuth, getMetrics);

export default router;
