import express from "express";
import { requireAuth } from "../middleware/auth";
import {
  generateInsights,
  getInsights,
} from "../controllers/insightsController";

const router = express.Router();

router.get("/", requireAuth, getInsights);
router.post("/generate", requireAuth, generateInsights);

export default router;
