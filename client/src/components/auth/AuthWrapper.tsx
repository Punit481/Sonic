import { useAuthSync } from "../../hooks/useAuthSync";

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  useAuthSync();

  return <>{children}</>;
}
