import home from "../../assets/icons/home.svg";
import logs from "../../assets/icons/logs.png";
import insights from "../../assets/icons/insights.png";

import micIcon from "../../assets/icons/bmic.png";
import SideBarFile from "./SideBarFile";

import { useDashboardStore } from "../../stores/dashboardStore";

function SideBar() {
  const { currentLocation, setCurrentLocation } = useDashboardStore();

  const sideBarItems = [
    {
      id: 1,
      title: "Dashboard",
      isFocused: currentLocation === "dashboard",
      icon: home,
      location: "dashboard" as const,
    },
    {
      id: 2,
      title: "Logs",
      isFocused: currentLocation === "logs",
      icon: logs,
      location: "logs" as const,
    },
    {
      id: 3,
      title: "Insights",
      isFocused: currentLocation === "insights",
      icon: insights,
      location: "insights" as const,
    },
    // {
    //   id: 4,
    //   title: "Settings",
    //   isFocused: currentLocation === "settings",
    //   icon: settings,
    //   location: "settings" as const,
    // },

    {
      id: 4,
      title: "Voice Log",
      isFocused: currentLocation === "voicelog",
      icon: micIcon,
      location: "voicelog" as const,
    },
  ];

  const handleNavClick = (location: (typeof sideBarItems)[0]["location"]) => {
    setCurrentLocation(location);
  };

  return (
    <>
      <div className="bg-white p-4 rounded-lg main-container 3xl:p-16 gap-8 flex flex-col justify-between items-between mt-0 3xl:h-[100vh] 3xl:fixed 3xl:left-0 3xl:top-0 3xl:mt-0 3xl:w-[300px]">
        <div className="flex flex-row 3xl:flex-col justify-center gap-4">
          {sideBarItems.map((item) => (
            <SideBarFile
              key={item.id}
              title={item.title}
              icon={item.icon}
              isFocussed={item.isFocused}
              onClick={() => handleNavClick(item.location)}
            />
          ))}
        </div>{" "}
      </div>
    </>
  );
}

export default SideBar;
