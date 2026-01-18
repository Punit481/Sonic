import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

export type StructuredGeminiError = {
  name: "StructuredGeminiError";
  message: string;
  originalError?: unknown;
};

export type SchemaValidationError = {
  name: "SchemaValidationError";
  message: string;
  receivedData?: unknown;
};

export function createStructuredGeminiError(
  message: string,
  originalError?: unknown
): StructuredGeminiError {
  return {
    name: "StructuredGeminiError",
    message,
    originalError,
  };
}

export function createSchemaValidationError(
  message: string,
  receivedData?: unknown
): SchemaValidationError {
  return {
    name: "SchemaValidationError",
    message,
    receivedData,
  };
}

export function isStructuredGeminiError(
  error: unknown
): error is StructuredGeminiError {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as any).name === "StructuredGeminiError"
  );
}

export function isSchemaValidationError(
  error: unknown
): error is SchemaValidationError {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as any).name === "SchemaValidationError"
  );
}

/**
 * Call Gemini with structured output using a JSON schema
 */
export async function callStructuredGemini<T>(
  prompt: string,
  schema: object
): Promise<T> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    });

    if (!response.text) {
      throw createStructuredGeminiError(
        "No response text received from Gemini"
      );
    }

    let parsedResponse: T;
    try {
      parsedResponse = JSON.parse(response.text);
    } catch (parseError) {
      throw createStructuredGeminiError(
        "Failed to parse Gemini response as JSON",
        parseError
      );
    }

    // Basic validation that we received an object
    if (typeof parsedResponse !== "object" || parsedResponse === null) {
      throw createSchemaValidationError(
        "Response is not a valid object",
        parsedResponse
      );
    }

    return parsedResponse;
  } catch (error) {
    if (isStructuredGeminiError(error) || isSchemaValidationError(error)) {
      throw error;
    }
    throw createStructuredGeminiError(
      "Failed to call structured Gemini API",
      error
    );
  }
}

/**
 * Validate that a parsed response matches expected structure
 */
export function validateSchema<T>(
  data: unknown,
  validator: (data: unknown) => data is T,
  schemaName: string
): T {
  if (!validator(data)) {
    throw createSchemaValidationError(
      `Response does not match ${schemaName} schema`,
      data
    );
  }
  return data;
}

// Type guards for schema validation
export function isClassificationResponse(data: unknown): data is {
  intent: "WORKOUT_LOG" | "BODY_METRIC" | "MIXED" | "UNCLEAR";
  confidence: number;
} {
  return (
    typeof data === "object" &&
    data !== null &&
    "intent" in data &&
    "confidence" in data &&
    typeof (data as any).intent === "string" &&
    ["WORKOUT_LOG", "BODY_METRIC", "MIXED", "UNCLEAR"].includes(
      (data as any).intent
    ) &&
    typeof (data as any).confidence === "number" &&
    (data as any).confidence >= 0 &&
    (data as any).confidence <= 1
  );
}

export function isWorkoutLogResponse(data: unknown): data is {
  parsedJson: {
    exercises: Array<{
      name: string;
      category: "strength" | "cardio" | "mobility" | "custom";
      isCustom: boolean;
      sets: Array<{
        reps?: number | null;
        weight?: number | null;
        distance?: number | null;
        duration?: number | null;
        intensity?: "easy" | "moderate" | "hard" | "max" | null;
        note?: string | null;
      }>;
    }>;
  };
  duration?: number | null;
  note?: string | null;
} {
  return (
    typeof data === "object" &&
    data !== null &&
    "parsedJson" in data &&
    typeof (data as any).parsedJson === "object" &&
    (data as any).parsedJson !== null &&
    "exercises" in (data as any).parsedJson &&
    Array.isArray((data as any).parsedJson.exercises) &&
    (data as any).parsedJson.exercises.length > 0 &&
    (data as any).parsedJson.exercises.every(
      (exercise: any) =>
        typeof exercise === "object" &&
        exercise !== null &&
        typeof exercise.name === "string" &&
        typeof exercise.category === "string" &&
        ["strength", "cardio", "mobility", "custom"].includes(
          exercise.category
        ) &&
        typeof exercise.isCustom === "boolean" &&
        Array.isArray(exercise.sets) &&
        exercise.sets.length > 0
    )
  );
}

export function isBodyMetricResponse(data: unknown): data is {
  weight?: number | null;
  bodyFat?: number | null;
  muscleMass?: number | null;
  date?: string | null;
  note?: string | null;
} {
  return (
    typeof data === "object" &&
    data !== null &&
    (("weight" in data &&
      (typeof (data as any).weight === "number" ||
        (data as any).weight === null)) ||
      ("bodyFat" in data &&
        (typeof (data as any).bodyFat === "number" ||
          (data as any).bodyFat === null)) ||
      ("muscleMass" in data &&
        (typeof (data as any).muscleMass === "number" ||
          (data as any).muscleMass === null)))
  );
}

export function isUnifiedVoiceLogResponse(data: unknown): data is {
  workout?: {
    exercises?: Array<{
      name: string;
      category: "strength" | "cardio" | "mobility" | "custom";
      isCustom: boolean;
      sets: Array<{
        reps?: number | null;
        weight?: number | null;
        distance?: number | null;
        duration?: number | null;
        intensity?: "easy" | "moderate" | "hard" | "max" | null;
        note?: string | null;
      }>;
    }> | null;
    duration?: number | null;
    note?: string | null;
  } | null;
  bodyMetrics?: {
    weight?: number | null;
    bodyFat?: number | null;
    muscleMass?: number | null;
    date?: string | null;
    note?: string | null;
  } | null;
} {
  return (
    typeof data === "object" &&
    data !== null &&
    (!("workout" in data) ||
      (data as any).workout === null ||
      (typeof (data as any).workout === "object" &&
        (!("exercises" in (data as any).workout) ||
          (data as any).workout.exercises === null ||
          Array.isArray((data as any).workout.exercises)))) &&
    (!("bodyMetrics" in data) ||
      (data as any).bodyMetrics === null ||
      typeof (data as any).bodyMetrics === "object")
  );
}

export function isInsightsResponse(data: unknown): data is {
  summary: string;
  achievements: string[];
  trends: {
    volume?: string | null;
    frequency?: string | null;
    bodyComposition?: string | null;
  };
  recommendations: Array<{
    priority: "high" | "medium" | "low";
    action: string;
    reasoning: string;
  }>;
  warnings: string[];
  nextSteps: string[];
} {
  return (
    typeof data === "object" &&
    data !== null &&
    "summary" in data &&
    typeof (data as any).summary === "string" &&
    "achievements" in data &&
    Array.isArray((data as any).achievements) &&
    (data as any).achievements.length >= 3 &&
    (data as any).achievements.every((item: any) => typeof item === "string") &&
    "trends" in data &&
    typeof (data as any).trends === "object" &&
    "recommendations" in data &&
    Array.isArray((data as any).recommendations) &&
    (data as any).recommendations.length >= 2 &&
    (data as any).recommendations.every(
      (rec: any) =>
        typeof rec === "object" &&
        rec !== null &&
        typeof rec.priority === "string" &&
        ["high", "medium", "low"].includes(rec.priority) &&
        typeof rec.action === "string" &&
        typeof rec.reasoning === "string"
    ) &&
    "warnings" in data &&
    Array.isArray((data as any).warnings) &&
    (data as any).warnings.every((item: any) => typeof item === "string") &&
    "nextSteps" in data &&
    Array.isArray((data as any).nextSteps) &&
    (data as any).nextSteps.length >= 3 &&
    (data as any).nextSteps.every((item: any) => typeof item === "string")
  );
}
