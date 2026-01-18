import Card from "../ui/Card";
import mic from "../../assets/icons/mic.svg";
import chart from "../../assets/icons/chart.svg";
import database from "../../assets/icons/database.svg";
import Section from "../layout/Section";

const howItWorksSteps = [
  {
    id: 1,
    title: "Speak Your Workout",
    subtitle:
      "Just talk naturally about your exercises, sets, and reps. No typing required.",
    icon: mic,
  },
  {
    id: 2,
    title: "Structured And Stored",
    subtitle:
      "Our AI instantly converts your speech into structured workout data.",
    icon: database,
  },
  {
    id: 3,
    title: "Get Insights",
    subtitle: "View every metric and recieve smart AI suggestions.",
    icon: chart,
  },
];

function How() {
  return (
    <Section
      title="How Sonic Works"
      subtitle="From voice to insight in seconds"
      children={howItWorksSteps.map((step) => (
        <Card animate={false} size="md" key={step.id}>
          <img
            src={step.icon}
            className="w-8 bg-primary-400 rounded-full p-2"
            alt=""
          />
          <h4 className="text-lg font-semibold text-black-900 mt-4 mb-2">
            {step.title}
          </h4>
          <p className="text-black-700 leading-relaxed para">{step.subtitle}</p>
        </Card>
      ))}
    />
  );
}

export default How;
