import Footer from "../components/layout/Footer";
import MainDash from "../components/dashboard/MainDash";
import Navbar from "../components/layout/Navbar";

import SideBar from "../components/layout/SideBar";
import LogsPage from "../components/dashboard/LogsPage";
import InsightsPage from "../components/dashboard/InsightsPage";
import SettingsPage from "../components/dashboard/SettingsPage";
import VoiceLogPage from "../components/dashboard/VoiceLogPage";
import { useDashboardStore } from "../stores/dashboardStore";
import { useUserStore } from "../stores/userStore";

import YearStreak from "../components/ui/YearStreak";
import { useStreakData } from "../hooks/useStreakData";
import RightSideBar from "../components/RightSideBar";

function Dashboard() {
  const { currentLocation } = useDashboardStore();
  const { logs } = useUserStore();
  const streakData = useStreakData(logs);

  const renderMainContent = () => {
    switch (currentLocation) {
      case "dashboard":
        return (
          <>
            <MainDash />
            <RightSideBar />
          </>
        );
      case "logs":
        return (
          <>
            <LogsPage />
          </>
        );
      case "insights":
        return (
          <>
            <InsightsPage />
            <RightSideBar />
          </>
        );
      case "settings":
        return <SettingsPage />;
      case "voicelog":
        return <VoiceLogPage />;
      default:
        return (
          <>
            <MainDash />
            <RightSideBar />
          </>
        );
    }
  };

  return (
    <>
      <SideBar />

      <div className="3xl:ml-[300px] min-h-screen flex flex-col">
        <div className="3xl:block hidden">
          <Navbar />
        </div>
        <div className="main-container flex flex-col 3xl:flex-row justify-between gap-16 3xl:gap-0 m-auto p-0 flex-grow">
          {renderMainContent()}
          {currentLocation === "dashboard" ? (
            <div className="3xl:hidden block">
              <YearStreak title="Workout Activity" streakData={streakData} />
            </div>
          ) : (
            ""
          )}
        </div>

        <Footer />
      </div>
    </>
  );
}

export default Dashboard;
