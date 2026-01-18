import CalendarDay from "./CalendarDay";
import { useCalendar } from "../../hooks/useCalendar";
import type { CalendarData } from "../../hooks/useCalendarData";

interface CalendarProps {
  data: CalendarData[];
  canGoToNextMonth: (currentMonth: number, currentYear: number) => boolean;
  formatDateKey: (date: Date) => string;
  onDateClick?: (date: Date) => void;
}

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Calendar({
  data,
  canGoToNextMonth,
  formatDateKey,
  onDateClick,
}: CalendarProps) {
  const {
    currentMonth,
    currentYear,
    calendarDays,
    dataMap,
    goToPreviousMonth,
    goToNextMonth,
    isToday,
  } = useCalendar(data, canGoToNextMonth);

  const handleDayClick = (day: {
    date: number;
    isCurrentMonth: boolean;
    fullDate: Date;
  }) => {
    if (onDateClick) {
      onDateClick(day.fullDate);
    }
  };

  return (
    <div className="card p-4 ">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Previous month"
        >
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <h2 className="text-lg font-semibold text-gray-800">
          {monthNames[currentMonth]} {currentYear}
        </h2>

        <button
          onClick={goToNextMonth}
          disabled={!canGoToNextMonth(currentMonth, currentYear)}
          className={`p-2 rounded-full transition-colors ${
            canGoToNextMonth(currentMonth, currentYear)
              ? "hover:bg-gray-100 text-gray-600"
              : "text-gray-300 cursor-not-allowed"
          }`}
          aria-label="Next month"
        >
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-3 mb-3">
        {dayNames.map((day) => (
          <div
            key={day}
            className="h-8 flex items-center justify-center text-sm font-medium text-gray-600"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-3">
        {calendarDays.map((day, index) => {
          const dateKey = formatDateKey(day.fullDate);
          const dayData = dataMap.get(dateKey) || {
            highlight: false,
            intensity: "none",
          };

          return (
            <CalendarDay
              key={index}
              date={day.date}
              highlight={dayData.highlight}
              intensity={dayData.intensity}
              isToday={isToday(day.fullDate)}
              isCurrentMonth={day.isCurrentMonth}
              onClick={() => handleDayClick(day)}
            />
          );
        })}
      </div>
    </div>
  );
}
