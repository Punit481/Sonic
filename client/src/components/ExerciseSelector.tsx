import { useDashboardStore } from "../stores/dashboardStore";
import type { ExerciseMetricType } from "../stores/dashboardStore";

interface ExerciseSelectorProps {
  className?: string;
}

const ExerciseSelector = ({ className = "" }: ExerciseSelectorProps) => {
  const {
    availableExercises,
    selectedExercise,
    selectedMetricType,
    setSelectedExercise,
    setSelectedMetricType,
  } = useDashboardStore();

  const getAvailableMetrics = (): ExerciseMetricType[] => {
    if (!selectedExercise) return ["weight", "duration", "reps"];

    const exercise = availableExercises.find(
      (ex) => ex.name.toLowerCase() === selectedExercise.toLowerCase()
    );

    return exercise?.availableMetrics || ["weight"];
  };

  const availableMetrics = getAvailableMetrics();

  if (availableExercises.length === 0) {
    return (
      <div className={`p-4 card ${className}`}>
        <div className="text-center text-gray-500">
          <p className="text-sm font-medium">No exercises logged yet</p>
          <p className="text-xs mt-1">Start logging workouts to see options!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 card ${className} h-auto`}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Track Exercise
          </label>
          <select
            value={selectedExercise || ""}
            onChange={(e) => setSelectedExercise(e.target.value || null)}
            className="w-full p-2 border border-gray-300 rounded-md bg-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Select an exercise...</option>
            {availableExercises.map((exercise) => (
              <option key={exercise.name} value={exercise.name}>
                {exercise.name} ({exercise.totalSessions} sessions)
              </option>
            ))}
          </select>
        </div>

        {selectedExercise && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Metric Type
            </label>
            <div className="flex gap-2">
              {availableMetrics.map((metric) => (
                <button
                  key={metric}
                  onClick={() => setSelectedMetricType(metric)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    selectedMetricType === metric
                      ? "bg-primary-500 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {metric.charAt(0).toUpperCase() + metric.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedExercise && (
          <div className="mt-3 p-3 bg-gray-50 rounded-md">
            <div className="text-xs text-gray-600">
              {(() => {
                const exercise = availableExercises.find(
                  (ex) =>
                    ex.name.toLowerCase() === selectedExercise.toLowerCase()
                );
                if (!exercise) return null;

                return (
                  <div className="space-y-1">
                    <p>
                      <span className="font-medium">Category:</span>{" "}
                      {exercise.category}
                    </p>
                    <p>
                      <span className="font-medium">Sessions:</span>{" "}
                      {exercise.totalSessions}
                    </p>
                    <p>
                      <span className="font-medium">Last logged:</span>{" "}
                      {exercise.lastLogged.toLocaleDateString()}
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExerciseSelector;
