import { type ReactNode } from "react";

interface CardProps {
  children?: ReactNode;
  className?: string;
  size: "sm" | "md" | "lg";
  animate: boolean;
  border?: string;
}

const sizeVariants = {
  sm: "px-4 py-8",
  md: "px-8 py-16",
  lg: "md:px-10 md:py-20 px-8 py-16",
};

const styles = {
  layout: "flex flex-col items-center justify-center flex-1",
  default:
    "bg-white rounded-xl shadow-sm border border-black-200 hover:shadow-lg transition-all duration-300 ease-in-out",
};

export default function Card(props: CardProps) {
  return (
    <div
      className={`${styles.layout} ${styles.default}  ${
        sizeVariants[props.size]
      } ${props.animate ? "hover:scale-110" : ""} ${
        props.border ? "border-" + props.border : ""
      } ${props.className} relative`}
    >
      {props.children}
    </div>
  );
}
