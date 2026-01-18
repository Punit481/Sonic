import { useEffect } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useUserStore } from "../stores/userStore";

export const useAuthSync = () => {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user: clerkUser } = useUser();

  const {
    setUser,
    fetchLogs,
    clearStore,
    fetchMetrics,
    fetchToProcess,
    fetchIsPremium,
  } = useUserStore();

  useEffect(() => {
    if (isSignedIn && clerkUser) {
      const userData = {
        id: clerkUser.id,
        fullName: clerkUser.fullName,
        email: clerkUser.primaryEmailAddress?.emailAddress || "",
        avatar: clerkUser.imageUrl,
      };

      setUser(userData);

      const fetchWithToken = async () => {
        const token = await getToken();
        if (token) {
          fetchLogs(token);
          fetchMetrics(token);
          fetchToProcess(token);
          fetchIsPremium(token);
        }
      };

      fetchWithToken();
    } else {
      clearStore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, clerkUser]);

  return { getToken };
};
