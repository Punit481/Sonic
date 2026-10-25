import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

export default function Support() {
  const faqs = [
    {
      question: "How do I log my workouts?",
      answer:
        "Navigate to the Voice Log page, click the microphone button, and speak naturally about your workout. For example: 'I did 3 sets of bench press, 10 reps each at 135 pounds.' The AI will automatically parse and log your workout.",
    },
    {
      question: "What exercises can I track?",
      answer:
        "You can track strength training (weights, reps), cardio (duration, distance), and mobility exercises. The system recognizes most common exercise names and variations.",
    },
    {
      question: "How do I generate AI insights?",
      answer:
        "Go to the Insights page and click 'Generate Insights.' You need at least 3 logged workouts to generate insights. New insights can be generated once every 24 hours.",
    },
    {
      question: "Can I track body metrics?",
      answer:
        "Yes! Use the voice logging feature to mention body metrics. For example: 'My weight today is 75kg' or 'My body fat is 15%.' These will be automatically logged and tracked over time.",
    },
    {
      question: "How does voice recognition work?",
      answer:
        "The app uses browser-based speech recognition for free tier users. Simply speak clearly into your microphone, and the system will transcribe and process your workout data using AI.",
    },
    {
      question: "Can I edit my logged workouts?",
      answer:
        "Currently, workouts are logged as-is from voice input. Make sure to speak clearly and review your logs page to verify the data was captured correctly.",
    },
  ];

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-16">
        <div className="main-container">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Support & Help Center
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to know about using Sonic for your fitness
              journey
            </p>
          </div>

          {/* FAQs */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Frequently Asked Questions
            </h2>
            <div className="max-w-3xl mx-auto space-y-4">
              {faqs.map((faq, index) => (
                <div key={index} className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {faq.question}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Start Guide */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Quick Start Guide
            </h2>
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="card">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Sign Up & Log In
                    </h3>
                    <p className="text-gray-600">
                      Create your account and log in to access all features.
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Log Your First Workout
                    </h3>
                    <p className="text-gray-600">
                      Go to Voice Log, click the microphone, and speak about
                      your workout. Try: "I did 3 sets of squats, 10 reps at
                      100kg."
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Track Your Progress
                    </h3>
                    <p className="text-gray-600">
                      View your dashboard to see workout summaries, exercise
                      charts, and training calendar.
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                    4
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Get AI Insights
                    </h3>
                    <p className="text-gray-600">
                      After logging at least 3 workouts, generate personalized
                      AI insights to optimize your training.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="card max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Still Need Help?
            </h2>
            <p className="text-gray-600 mb-6">
              Can't find what you're looking for? We're here to help!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href="mailto:support@sonic-fitness.com"
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                Email Support
              </a>
              <a
                href="https://github.com/Shekhar-Dangi/sonic/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Report Issue
              </a>
            </div>
            <p className="text-sm text-gray-500 mt-6">
              Response time: Usually within 24-48 hours
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
