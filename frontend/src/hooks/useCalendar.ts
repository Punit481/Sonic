import { useState, useMemo } from "react";

interface CalendarData {
  date: string;
  highlight: boolean;
  intensity?: "none" | "low" | "medium" | "high";
}

interface CalendarDay {
  date: number;
  isCurrentMonth: boolean;
  fullDate: Date;
}

interface UseCalendarResult {
  currentDate: Date;
  currentMonth: number;
  currentYear: number;
  calendarDays: CalendarDay[];
  dataMap: Map<
    string,
    { highlight: boolean; intensity?: "none" | "low" | "medium" | "high" }
  >;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  isToday: (date: Date) => boolean;
}

export const useCalendar = (
  data: CalendarData[],
  canGoToNextMonth: (currentMonth: number, currentYear: number) => boolean
): UseCalendarResult => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const days: CalendarDay[] = [];

    const prevMonth = new Date(currentYear, currentMonth - 1, 0);
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = prevMonth.getDate() - i;
      days.push({
        date,
        isCurrentMonth: false,
        fullDate: new Date(currentYear, currentMonth - 1, date),
      });
    }

    for (let date = 1; date <= daysInMonth; date++) {
      days.push({
        date,
        isCurrentMonth: true,
        fullDate: new Date(currentYear, currentMonth, date),
      });
    }

    const remainingCells = 42 - days.length;
    for (let date = 1; date <= remainingCells; date++) {
      days.push({
        date,
        isCurrentMonth: false,
        fullDate: new Date(currentYear, currentMonth + 1, date),
      });
    }

    return days;
  }, [currentMonth, currentYear]);

  const dataMap = useMemo(() => {
    const map = new Map();
    data.forEach((item) => {
      map.set(item.date, {
        highlight: item.highlight,
        intensity: item.intensity,
      });
    });
    return map;
  }, [data]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    if (canGoToNextMonth(currentMonth, currentYear)) {
      setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    }
  };

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  return {
    currentDate,
    currentMonth,
    currentYear,
    calendarDays,
    dataMap,
    goToPreviousMonth,
    goToNextMonth,
    isToday,
  };
};
