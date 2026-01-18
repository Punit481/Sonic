import { useUserStore } from "../../stores/userStore";

const LogsPage = () => {
  const { logs } = useUserStore();

  const recentLogs = logs
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (recentLogs.length === 0) {
    return (
      <div className="flex-1/1 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Recent Logs</h1>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="text-gray-400 mb-4">
              <svg
                className="w-24 h-24 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              No workout logs yet
            </h3>
            <p className="text-gray-500 mb-6">
              Start logging your workouts using the voice recorder!
            </p>
            <div className="bg-blue-50 p-4 rounded-lg max-w-md mx-auto">
              <p className="text-sm text-blue-700">
                <strong>Tip:</strong> Use the microphone button in the sidebar
                to record your workout details like "Did 3 sets of bench press,
                10 reps each at 135 pounds"
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1/1 mb-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Recent Logs</h1>
        <p className="text-gray-600">Your last 10 workout sessions</p>
      </div>

      <div className="space-y-6">
        {recentLogs.map((log) => (
          <div key={log.id} className="card">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-gray-600">
                {formatDate(log.date)}
              </div>
              <div className="bg-green-100 text-green-700 px-3 py-1 rounded-md text-xs font-medium">
                Completed
              </div>
            </div>

            {log.note && (
              <div className="mb-6">
                <p className="text-gray-700 italic">"{log.note}"</p>
              </div>
            )}

            <div className="space-y-4">
              {log.exercises.map((exercise, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {exercise.category === "strength" ? (
                      <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-purple-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M17.5 2h-15C1.67 2 1 2.67 1 3.5S1.67 5 2.5 5h15C18.33 5 19 4.33 19 3.5S18.33 2 17.5 2zM17.5 15h-15C1.67 15 1 15.67 1 16.5S1.67 18 2.5 18h15c.83 0 1.5-.67 1.5-1.5S18.33 15 17.5 15zM10 6.5c-1.93 0-3.5 1.57-3.5 3.5S8.07 13.5 10 13.5s3.5-1.57 3.5-3.5S11.93 6.5 10 6.5z" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-teal-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 2L3 7v11a2 2 0 002 2h10a2 2 0 002-2V7l-7-5z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900">
                        {exercise.name}
                      </h4>
                      <span
                        className={`px-2 py-1 rounded-md text-xs font-medium ${
                          exercise.category === "strength"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-teal-100 text-teal-700"
                        }`}
                      >
                        {exercise.category === "strength"
                          ? "Strength"
                          : "Cardio"}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                      {exercise.sets.map((set, setIndex) => (
                        <div key={setIndex} className="flex items-center">
                          <span className="font-medium">
                            Set {setIndex + 1}:
                          </span>
                          <span className="ml-1">
                            {set.reps && `${set.reps} reps`}
                            {set.weight && ` @ ${set.weight} kg`}
                            {set.duration && `${set.duration} hrs`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {logs.length > 10 && (
        <div className="mt-8 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm">
            Showing 10 most recent logs. You have {logs.length - 10} more older
            logs.
          </div>
        </div>
      )}
    </div>
  );
};

export default LogsPage;
