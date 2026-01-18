import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import transcribe from "../utils/elevenlabs";
import {
  isStructuredGeminiError,
  isSchemaValidationError
} from "../utils/structuredGemini";
import { handleUnifiedVoiceLog } from "./voiceHandlers";

export const logVoicePremium = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  if (!req.authUserId || !req.isPremium) {
    res.status(201).json({
      message: "User not authenticated",
    });
  }
  const file = req.file;
  if (!file) {
    res.status(500).json({
      message: "No file found",
    });
  }

  if (file) {
    const nodeBuffer: Buffer = file.buffer;

    const uint8array = new Uint8Array(nodeBuffer);

    const blob = new Blob([uint8array], { type: file.mimetype });
    const response = await transcribe(blob);
    res.json({ success: "true", transcription: response });
  }
};

export const logVoice = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { transcript } = req.body;

    if (!transcript || transcript.trim() === "") {
      res.status(400).json({
        success: false,
        error: "No transcript provided",
      });
      return;
    }

    // Process with unified handler - no classification needed
    await handleUnifiedVoiceLog(req, res, transcript);
  } catch (error) {
    console.error("Error in logVoice:", error);
    
    if (isStructuredGeminiError(error) || isSchemaValidationError(error)) {
      res.status(400).json({
        success: false,
        error: "Failed to understand the input",
        suggestion: "Please try rephrasing your input more clearly",
        details: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: "Failed to process voice input",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
};


