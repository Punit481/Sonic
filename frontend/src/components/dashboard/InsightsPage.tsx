import { useInsights, type Recommendation } from "../../hooks/useInsights";

const getTimeRemaining = (targetDate: Date): string => {
  const now = new Date();
  const diff = new Date(targetDate).getTime() - now.getTime();

  if (diff <= 0) return "now";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

const InsightsPage = () => {
  const {
    insights,
    isLoading,
    isGenerating,
    generateInsights,
    canRegenerate,
    canRegenerateAt,
  } = useInsights();

  if (isLoading) {
    return (
      <div className="flex-1/1 py-12">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading insights...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="flex-1/1 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">AI Insights</h1>
        <div className="flex items-center justify-center h-96">
          <div className="text-center max-w-lg">
            <div className="text-primary-400 mb-4">
              <svg
                className="w-24 h-24 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              No insights yet
            </h3>
            <p className="text-gray-500 mb-6">
              Generate personalized AI insights based on your workout history
              and progress.
            </p>
            <button
              onClick={generateInsights}
              disabled={isGenerating}
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? "Generating..." : "Generate Insights"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex-1/1 mb-8">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Insights</h1>
          <p className="text-gray-600">
            Personalized analysis of your training progress
          </p>
          {insights.generatedAt && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {formatDate(insights.generatedAt)}
            </p>
          )}
        </div>
        <button
          onClick={generateInsights}
          disabled={isGenerating || !canRegenerate}
          className="bg-white border border-gray-300 hover:border-primary-600 text-gray-700 hover:text-primary-600 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          title={
            !canRegenerate && canRegenerateAt
              ? `Available after ${new Date(canRegenerateAt).toLocaleString()}`
              : "Refresh insights"
          }
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
              Generating...
            </span>
          ) : !canRegenerate && canRegenerateAt ? (
            `Available in ${getTimeRemaining(canRegenerateAt)}`
          ) : (
            "Refresh Insights"
          )}
        </button>
      </div>

      {/* Summary */}
      {insights.summary && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Overall Assessment
          </h3>
          <p className="text-gray-700 leading-relaxed">{insights.summary}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md-lg:grid-cols-2 gap-6">
        {/* Achievements */}
        {insights.achievements && insights.achievements.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path
                    fillRule="evenodd"
                    d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Achievements
              </h3>
            </div>
            <ul className="space-y-3">
              {insights.achievements.map(
                (achievement: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">•</span>
                    <span className="text-gray-700 flex-1">{achievement}</span>
                  </li>
                )
              )}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {insights.recommendations && insights.recommendations.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-primary-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Recommendations
              </h3>
            </div>
            <div className="space-y-4">
              {insights.recommendations.map(
                (rec: Recommendation, index: number) => (
                  <div
                    key={index}
                    className="border-l-4 border-primary-600 pl-4"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900">{rec.action}</p>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          rec.priority === "high"
                            ? "bg-red-100 text-red-700"
                            : rec.priority === "medium"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {rec.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{rec.reasoning}</p>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Trends */}
        {insights.trends && (
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Trends</h3>
            </div>
            <div className="space-y-3">
              {insights.trends.volume && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Volume
                  </p>
                  <p className="text-gray-600">{insights.trends.volume}</p>
                </div>
              )}
              {insights.trends.frequency && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Frequency
                  </p>
                  <p className="text-gray-600">{insights.trends.frequency}</p>
                </div>
              )}
              {insights.trends.bodyComposition && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Body Composition
                  </p>
                  <p className="text-gray-600">
                    {insights.trends.bodyComposition}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Warnings */}
        {insights.warnings && insights.warnings.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-orange-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Watch Out</h3>
            </div>
            <ul className="space-y-3">
              {insights.warnings.map((warning: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-orange-600 mt-1">⚠</span>
                  <span className="text-gray-700 flex-1">{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Next Steps */}
      {insights.nextSteps && insights.nextSteps.length > 0 && (
        <div className="card mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Next Steps
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md-lg:grid-cols-3 gap-3">
            {insights.nextSteps.map((step: string, index: number) => (
              <div
                key={index}
                className="bg-primary-50 border border-primary-200 rounded-lg p-4 hover:border-primary-400 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <span className="text-primary-600 font-bold text-lg">
                    {index + 1}
                  </span>
                  <p className="text-gray-700 text-sm flex-1">{step}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InsightsPage;
