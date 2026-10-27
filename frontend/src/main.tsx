import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { ClerkProvider } from "@clerk/clerk-react";
import "./index.css";
import { clerkAppearance } from "./clerkAppearance";
import AppLayout from "./components/AppLayout";
import { SignInPage, SignUpPage } from "./pages/AuthPages";
import HistoryPage from "./pages/HistoryPage";
import ExercisePage from "./pages/ExercisePage";
import ExercisesPage from "./pages/ExercisesPage";
import InsightsPage from "./pages/InsightsPage";
import Landing from "./pages/Landing";
import LogPage from "./pages/LogPage";
import OverviewPage from "./pages/OverviewPage";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Add your Clerk Publishable Key to the .env file");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ClerkProvider
        publishableKey={PUBLISHABLE_KEY}
        signInFallbackRedirectUrl="/app"
        signUpFallbackRedirectUrl="/app"
        afterSignOutUrl="/"
        appearance={clerkAppearance}
      >
        <Routes>
          <Route index element={<Landing />} />
          <Route path="/sign-in/*" element={<SignInPage />} />
          <Route path="/sign-up/*" element={<SignUpPage />} />
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<OverviewPage />} />
            <Route path="log" element={<LogPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="exercises" element={<ExercisesPage />} />
            <Route path="exercises/:name" element={<ExercisePage />} />
            <Route path="insights" element={<InsightsPage />} />
          </Route>
          {/* Old paths */}
          <Route path="/dashboard" element={<Navigate to="/app" replace />} />
          <Route path="/support" element={<Navigate to="/#faq" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ClerkProvider>
    </BrowserRouter>
  </StrictMode>
);
