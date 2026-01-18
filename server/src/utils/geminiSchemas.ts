import { Type } from "@google/genai";

const exerciseSetSchema = {
  type: Type.OBJECT,
  properties: {
    reps: {
      type: Type.NUMBER,
      nullable: true,
    },
    weight: {
      type: Type.NUMBER,
      nullable: true,
    },
    distance: {
      type: Type.NUMBER,
      nullable: true,
    },
    duration: {
      type: Type.NUMBER,
      nullable: true,
    },
    intensity: {
      type: Type.STRING,
      enum: ["easy", "moderate", "hard", "max"],
      nullable: true,
    },
    note: {
      type: Type.STRING,
      nullable: true,
    },
  },
  propertyOrdering: [
    "reps",
    "weight",
    "distance",
    "duration",
    "intensity",
    "note",
  ],
};

const exerciseSchema = {
  type: Type.OBJECT,
  properties: {
    name: {
      type: Type.STRING,
    },
    category: {
      type: Type.STRING,
      enum: ["strength", "cardio", "mobility", "custom"],
    },
    isCustom: {
      type: Type.BOOLEAN,
    },
    sets: {
      type: Type.ARRAY,
      items: exerciseSetSchema,
      minItems: 1,
    },
  },
  required: ["name", "category", "isCustom", "sets"],
  propertyOrdering: ["name", "category", "isCustom", "sets"],
};

export const unifiedVoiceLogSchema = {
  type: Type.OBJECT,
  properties: {
    // Workout data
    workout: {
      type: Type.OBJECT,
      properties: {
        exercises: {
          type: Type.ARRAY,
          items: exerciseSchema,
          nullable: true,
        },
        duration: {
          type: Type.NUMBER,
          nullable: true,
        },
        note: {
          type: Type.STRING,
          nullable: true,
        },
      },
      nullable: true,
      propertyOrdering: ["exercises", "duration", "note"],
    },
    // Body metric data
    bodyMetrics: {
      type: Type.OBJECT,
      properties: {
        weight: {
          type: Type.NUMBER,
          nullable: true,
        },
        bodyFat: {
          type: Type.NUMBER,
          nullable: true,
        },
        muscleMass: {
          type: Type.NUMBER,
          nullable: true,
        },
        date: {
          type: Type.STRING,
          format: "date",
          nullable: true,
        },
        note: {
          type: Type.STRING,
          nullable: true,
        },
      },
      nullable: true,
      propertyOrdering: ["weight", "bodyFat", "muscleMass", "date", "note"],
    },
  },
  propertyOrdering: ["workout", "bodyMetrics"],
};

// Unified prompt that handles everything
export const unifiedVoicePrompt = (transcript: string) => `
Analyze this voice input and extract both workout and body metric information:

Input: "${transcript}"

For WORKOUT data, extract:
- Exercise names (be intelligent about variations: bench press = bench, pull-ups = pullups)
- Sets, reps, weights, distances, durations
- Categories (strength, cardio, mobility, custom)
- Units: convert weight to kg, duration to hours (For example: 30 mins = 0.5 hrs)

IMPORTANT - Duration handling:
- If duration is mentioned for a specific exercise (like "running for 30 mins"), put it in that exercise's set duration field
- Only put duration in the workout-level duration field if explicitly mentioned for the entire workout session (like "my whole workout took 2 hours")
- Exercise-specific durations should NOT be added to workout-level duration

For BODY METRIC data, extract:
- Weight, body fat percentage, muscle mass
- Units: convert weight to kg, body fat as percentage
- Date context ("yesterday", "this morning") 
- Any measurement notes

If the input contains only workout data, set bodyMetrics to null.
If the input contains only body metrics, set workout to null.
If unclear or invalid input, set both to null.

Provide structured data for whatever you can extract from the input.
`;

// Insights Schema
const recommendationSchema = {
  type: Type.OBJECT,
  properties: {
    priority: {
      type: Type.STRING,
      enum: ["high", "medium", "low"],
    },
    action: {
      type: Type.STRING,
    },
    reasoning: {
      type: Type.STRING,
    },
  },
  required: ["priority", "action", "reasoning"],
  propertyOrdering: ["priority", "action", "reasoning"],
};

export const insightsSchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
    },
    achievements: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
      minItems: 3,
    },
    trends: {
      type: Type.OBJECT,
      properties: {
        volume: {
          type: Type.STRING,
          nullable: true,
        },
        frequency: {
          type: Type.STRING,
          nullable: true,
        },
        bodyComposition: {
          type: Type.STRING,
          nullable: true,
        },
      },
      propertyOrdering: ["volume", "frequency", "bodyComposition"],
    },
    recommendations: {
      type: Type.ARRAY,
      items: recommendationSchema,
      minItems: 2,
      maxItems: 5,
    },
    warnings: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
      maxItems: 5,
    },
    nextSteps: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
      minItems: 3,
      maxItems: 6,
    },
  },
  required: [
    "summary",
    "achievements",
    "trends",
    "recommendations",
    "warnings",
    "nextSteps",
  ],
  propertyOrdering: [
    "summary",
    "achievements",
    "trends",
    "recommendations",
    "warnings",
    "nextSteps",
  ],
};

// Insights prompt generator
export const createInsightsPrompt = (userData: {
  trainingPeriodDays: number;
  totalSessions: number;
  avgSessionsPerWeek: number;
  totalVolume: number;
  totalCardioDuration: number;
  exerciseDistribution: { strength: number; cardio: number; mobility: number };
  topExercises: Array<{ name: string; count: number; category: string }>;
  recentWeeksComparison: { current: number; previous: number };
  bodyMetrics?: {
    weightChange?: string;
    bodyFatChange?: string;
    muscleMassChange?: string;
    hasData: boolean;
  };
  userGoal?: string;
}) => `
You are an expert fitness coach and personal trainer analyzing a user's training data. Provide personalized, actionable insights based on their workout history and body metrics.

USER TRAINING DATA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Training Period: ${userData.trainingPeriodDays} days (${Math.round(userData.trainingPeriodDays / 7)} weeks)
Total Workout Sessions: ${userData.totalSessions}
Training Frequency: ${userData.avgSessionsPerWeek.toFixed(1)} sessions per week
Total Volume Lifted: ${userData.totalVolume.toFixed(0)} kg
Total Cardio Duration: ${userData.totalCardioDuration.toFixed(1)} hours

EXERCISE DISTRIBUTION:
- Strength Training: ${userData.exerciseDistribution.strength} sessions
- Cardio: ${userData.exerciseDistribution.cardio} sessions
- Mobility: ${userData.exerciseDistribution.mobility} sessions

TOP EXERCISES (by frequency):
${userData.topExercises.map((ex, idx) => `${idx + 1}. ${ex.name} - ${ex.count} sessions (${ex.category})`).join("\n")}

RECENT TREND (last 2 weeks vs previous 2 weeks):
- Sessions: ${userData.recentWeeksComparison.current} → ${userData.recentWeeksComparison.previous}
${
  userData.bodyMetrics?.hasData
    ? `
BODY COMPOSITION:
${userData.bodyMetrics.weightChange ? `- Weight: ${userData.bodyMetrics.weightChange}` : ""}
${userData.bodyMetrics.bodyFatChange ? `- Body Fat: ${userData.bodyMetrics.bodyFatChange}` : ""}
${userData.bodyMetrics.muscleMassChange ? `- Muscle Mass: ${userData.bodyMetrics.muscleMassChange}` : ""}
`
    : "- No body metrics tracked"
}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ANALYSIS GUIDELINES:
- Be specific, actionable, and encouraging
- Reference actual data points and exercises from above
- Identify patterns, imbalances, and opportunities
- Consider progressive overload, recovery, and sustainability
- Provide concrete next steps with exercise names and metrics

PROVIDE INSIGHTS IN THE FOLLOWING STRUCTURE:

1. SUMMARY (2-3 sentences):
   - Overall assessment of their training approach and progress
   - Highlight the most important trend or pattern

2. ACHIEVEMENTS (3-5 specific wins):
   - Celebrate consistency, progress, milestones, or PRs
   - Be specific with numbers and exercises
   - Make it motivating and personal

3. TRENDS:
   - Volume: Analyze total weight lifted and training volume progression
   - Frequency: Comment on workout consistency and schedule adherence
   - Body Composition: If data available, analyze weight/fat/muscle trends

4. RECOMMENDATIONS (2-4 actionable items):
   - Prioritize by importance (high/medium/low)
   - Provide specific actions (exercise names, set/rep ranges, frequency changes)
   - Explain the reasoning behind each recommendation
   - Focus on balance, progression, or recovery needs

5. WARNINGS (0-3 potential concerns):
   - Identify risks like overtraining, imbalances, or plateaus
   - Be constructive, not alarmist
   - Only include if genuinely concerning patterns exist

6. NEXT STEPS (3-5 concrete action items):
   - Specific exercises to add or modify
   - Measurable goals for the next 2-4 weeks
   - Quick wins they can implement immediately

Remember: Be a supportive coach, not just a data analyzer. Use an encouraging, personal trainer tone.
`;
