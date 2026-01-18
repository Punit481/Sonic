import Calendar from "./CustomCalendar/Calendar";
import ExerciseSelector from "./ExerciseSelector";
import { useUserStore } from "../stores/userStore";
import { useCalendarData } from "../hooks/useCalendarData";
import { useMetricChart } from "../hooks/useMetricChart";
import InteractiveContinuousChart from "./charts/InteractiveContinuousChart";

function RightSideBar() {
  const { logs } = useUserStore();
  const { calendarData, canGoToNextMonth, formatDateKey } =
    useCalendarData(logs);

  const {
    data: fatData,
    config: fatConfig,
    hasData: hasFatData,
  } = useMetricChart("bodyFat", "month");
  const handleDateClick = (date: Date) => {
    console.log("Selected date:", date);
  };

  return (
    <>
      <div className="flex-none p-0 3xl:px-8 flex flex-col sm-md:flex-row gap-4 justify-between 3xl:flex-col 3xl:justify-start ">
        <div className="3xl:block hidden">
          <Calendar
            data={calendarData}
            canGoToNextMonth={canGoToNextMonth}
            formatDateKey={formatDateKey}
            onDateClick={handleDateClick}
          />
        </div>
        <div className="hidden flex-1 xl:block 3xl:hidden">
          {hasFatData ? (
            <InteractiveContinuousChart data={fatData} config={fatConfig} />
          ) : (
            <div className="h-100 card py-8 px-2 flex items-center justify-center flex-1">
              <div className="text-center text-gray-500">
                <p className="text-lg font-medium">
                  No weight data for this month
                </p>
                <p className="text-sm">
                  Start logging your body metrics to see progress!
                </p>
              </div>
            </div>
          )}
        </div>
        <ExerciseSelector />
      </div>
    </>
  );
}

export default RightSideBar;
