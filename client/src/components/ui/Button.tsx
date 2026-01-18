import type { ReactNode } from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text: ReactNode;
  variant: "primary" | "secondary" | "accent";
  size: "sm" | "md" | "lg";
  className?: string;
  roundness?: "xs" | "md" | "lg" | "full";
}

const buttonVariants = {
  primary:
    "bg-primary-600 hover:bg-primary-700 active:bg-primary-700 text-white",
  secondary: "bg-black-100 hover:bg-black-200 text-black-900 font-semibold",
  accent:
    "bg-primary-100 text-black-900 hover:bg-primary-200 active:bg-primary-200 font-bold",
  defaults:
    "transition-colors duration-200 focus:outline-none focus:ring-2 cursor-pointer",
};

const buttonSizes = {
  sm: `px-7 py-1 text-sm`,
  md: "px-7 py-2 text-md",
  lg: "px-7 py-2 text-md md:py-3 xl:text-lg",
};

export function Button({
  text,
  variant,
  size,
  className,
  onClick,
  roundness = "md",
}: ButtonProps) {
  return (
    <>
      <button
        onClick={onClick}
        className={`${buttonVariants[variant]} ${buttonSizes[size]} ${
          buttonVariants.defaults
        } ${"rounded-" + roundness} ${className || ""}`}
      >
        {text}
      </button>
    </>
  );
}
