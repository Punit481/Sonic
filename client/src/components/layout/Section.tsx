import type { ReactNode } from "react";

interface SectionProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

function Section({ title, subtitle, children }: SectionProps) {
  return (
    <section className="main-container">
      <div className="mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl xl:text-3xl font-bold text-black-900 mb-4">
            {title}
          </h2>
          <p className="text-md 2xl:text-lg text-black-700">{subtitle}</p>
        </div>

        <div className="grid grid-rows-3  mx-auto xl:grid-cols-3 xl:grid-rows-none gap-8 lg:gap-10">
          {children}
        </div>
      </div>
    </section>
  );
}

export default Section;
