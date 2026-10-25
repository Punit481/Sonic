interface CalendarDayProps {
  date: number;
  highlight?: boolean;
  intensity?: "none" | "low" | "medium" | "high";
  isToday?: boolean;
  isCurrentMonth?: boolean;
  onClick?: () => void;
}

export default function CalendarDay({
  date,
  highlight = false,
  intensity = "none",
  isToday = false,
  isCurrentMonth = true,
  onClick,
}: CalendarDayProps) {
  const getIntensityStyle = () => {
    if (!highlight) {
      return "bg-gray-50 text-gray-700 hover:bg-gray-100";
    }

    switch (intensity) {
      case "low":
        return "bg-primary-300 text-white hover:bg-primary-400";
      case "medium":
        return "bg-primary-500 text-white hover:bg-primary-600";
      case "high":
        return "bg-primary-700 text-white hover:bg-primary-800";
      default:
        return "bg-primary-600 text-white hover:bg-primary-700";
    }
  };

  return (
    <div
      className={`
        aspect-square 3xl:w-full flex items-center justify-center cursor-pointer text-sm font-medium transition-colors rounded-full
        ${getIntensityStyle()}
        ${isToday ? "ring-2 ring-primary-300" : ""}
        ${!isCurrentMonth ? "opacity-50" : ""}
      `}
      onClick={onClick}
    >
      {date}
    </div>
  );
}
