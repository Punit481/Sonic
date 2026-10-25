// import PlanCard from "./PlanCard";
import Section from "../layout/Section";
import { Button } from "../ui/Button";
import Card from "../ui/Card";
import checkmark from "../../assets/icons/checkmark.svg";

function Plan() {
  const plans = [
    {
      id: 1,
      title: "Free",
      price: "$0",
      isPopular: false,
      features: [
        "20 voice logs per month",
        "Basic insight",
        "Data visualizations",
        "No AI feedback",
      ],
      text: "Get Started",
    },
    {
      id: 2,
      title: "Monthly",
      price: "$5",
      isPopular: false,
      features: [
        "Unlimited voice logs",
        "AI feedback (50 prompts/mo)",
        "Progress charts + comparasions",
        "Training suggestions",
      ],
      text: "Start Monthly",
    },
    {
      id: 3,
      title: "Yearly",
      price: "$49",
      desc: "Save 30%",
      isPopular: true,
      features: [
        "Everything in Monthly",
        "AI feedback (150 prompts/mo)",
        "Exclusive goal tracking tools",
        "Early access to features",
      ],
      text: "Start Yearly",
    },
  ];
  return (
    <Section
      title="Choose Your Plan"
      subtitle="Start free. Upgrade when you're ready."
      children={plans.map((plan) => (
        <Card
          key={plan.id}
          size="lg"
          animate={true}
          border={plan.isPopular ? "primary-600" : "black-200"}
          className={`items-start relative ${
            plan.isPopular ? "scale-102" : ""
          }`}
        >
          {plan.isPopular && (
            <div className="absolute -top-3 left-6/10  z-10">
              <span className="bg-primary-600 text-white px-4 py-2 rounded-full  font-semibold uppercase text-[10px] ">
                Most Popular
              </span>
            </div>
          )}
          <h4 className="text-md md:text-lg font-semibold mt-4 mb-2">
            {plan.title}
          </h4>
          <h3 className="text-xl md:text-2xl font-bold">
            {plan.price}{" "}
            <span className="text-black-400 text-sm font-normal">/month</span>
          </h3>
          <div className="mt-8 mb-8">
            {plan.features.map((feature) => (
              <p key={feature} className="para flex gap-2 items-center mb-2">
                <img
                  src={checkmark}
                  className="bg-primary-600 rounded-full h-4 w-4 p-1"
                />{" "}
                {feature}{" "}
              </p>
            ))}
          </div>
          {plan.price === "$0" ? (
            <Button
              variant="secondary"
              size="lg"
              text={plan.text}
              className="w-full"
            />
          ) : (
            <Button
              variant="primary"
              size="lg"
              text={plan.text}
              className="w-full"
            />
          )}
        </Card>
      ))}
    />
  );
}

export default Plan;
