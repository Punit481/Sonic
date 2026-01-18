import express from "express";
import { requireAuth } from "../middleware/auth";
import {
  createLog,
  getLogs,
  saveLog,
  getSavedLog,
} from "../controllers/logsController";

const router = express.Router();

router.post("/", requireAuth, createLog);
router.get("/", requireAuth, getLogs);
router.post("/save", requireAuth, saveLog);
router.get("/saved", requireAuth, getSavedLog);

export default router;
