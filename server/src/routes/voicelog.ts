import express from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth";
import { logVoice, logVoicePremium } from "../controllers/voicelogController";

const upload = multer();

const router = express.Router();

router.post("/", requireAuth, logVoice);
router.post("/premium", upload.single("file"), requireAuth, logVoicePremium);

export default router;
