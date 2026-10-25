import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import {
  fetchInsights as apiFetchInsights,
  generateInsights as apiGenerateInsights,
} from "../lib/api";

export interface Recommendation {
  priority: "high" | "medium" | "low";
  action: string;
  reasoning: string;
}

export interface Trends {
  volume?: string;
  frequency?: string;
  bodyComposition?: string;
}

export interface Insights {
  summary: string;
  achievements: string[];
  trends: Trends;
  recommendations: Recommendation[];
  warnings: string[];
  nextSteps: string[];
  generatedAt: Date;
}

export function useInsights() {
  const { getToken } = useAuth();
  const [insights, setInsights] = useState<Insights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canRegenerate, setCanRegenerate] = useState(true);
  const [canRegenerateAt, setCanRegenerateAt] = useState<Date | null>(null);

  const fetchInsights = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const data = await apiFetchInsights(token || undefined);

      if (data.insights) {
        setInsights({
          ...data.insights,
          generatedAt: new Date(data.insights.generatedAt),
        });
      } else {
        setInsights(null);
      }

      // Update canRegenerate status
      setCanRegenerate(data.canRegenerate ?? true);
      if (data.canRegenerateAt) {
        setCanRegenerateAt(new Date(data.canRegenerateAt));
      }
    } catch (err) {
      console.error("Error fetching insights:", err);
      setError("Failed to load insights");
      setInsights(null);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  // Auto-load insights on mount (check if they exist)
  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const generateInsights = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const token = await getToken();
      const data = await apiGenerateInsights(token || undefined);

      if (data.insights) {
        setInsights({
          ...data.insights,
          generatedAt: new Date(data.insights.generatedAt),
        });
      }

      // Update canRegenerate status
      setCanRegenerate(false);
      if (data.canRegenerateAt) {
        setCanRegenerateAt(new Date(data.canRegenerateAt));
      }
    } catch (err: unknown) {
      console.error("Error generating insights:", err);
      const errorMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error).message ||
        "Failed to generate insights";
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    insights,
    isLoading,
    isGenerating,
    error,
    canRegenerate,
    canRegenerateAt,
    generateInsights,
    refreshInsights: fetchInsights,
  };
}
