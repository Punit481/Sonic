export const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
};

export const createApiUrl = (path: string): string => {
  const baseUrl = getApiBaseUrl();

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};

// Insights API functions (ready for backend integration)
export const fetchInsights = async (token?: string) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(createApiUrl("/api/insights"), {
    headers,
  });

  if (!response.ok) {
    throw new Error("Failed to fetch insights");
  }

  return response.json();
};

export const generateInsights = async (token?: string) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(createApiUrl("/api/insights/generate"), {
    method: "POST",
    headers,
  });

  if (!response.ok) {
    throw new Error("Failed to generate insights");
  }

  return response.json();
};
