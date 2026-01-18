import express from "express";

import { requireAuth } from "../middleware/auth";

import { getPremium, setPremium } from "../controllers/usersController";

const router = express.Router();

router.post("/premium", requireAuth, setPremium);
router.get("/premium", requireAuth, getPremium);

export default router;
