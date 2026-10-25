import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router";
import { cx } from "../lib/cx";
import { Icon, type IconName } from "./Icon";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonStyles: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-ink hover:bg-accent-dim",
  secondary: "border border-line bg-raised text-ink hover:border-faint",
  ghost: "text-muted hover:bg-raised hover:text-ink",
  danger: "text-danger hover:bg-danger/10",
};

const buttonClass = (variant: ButtonVariant, size: "sm" | "md" | "lg", className?: string) =>
  cx(
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40",
    size === "sm" && "h-8 px-3 text-sm",
    size === "md" && "h-10 px-4 text-sm",
    size === "lg" && "h-12 px-6 text-base",
    buttonStyles[variant],
    className
  );

interface ButtonLook {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  icon?: IconName;
}

const ButtonIcon = ({ icon, size }: { icon?: IconName; size: string }) =>
  icon ? <Icon name={icon} className={size === "sm" ? "size-4" : "size-[18px]"} /> : null;

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & ButtonLook) {
  return (
    <button type="button" className={buttonClass(variant, size, className)} {...props}>
      <ButtonIcon icon={icon} size={size} />
      {children}
    </button>
  );
}

export function LinkButton({ variant = "secondary", size = "md", icon, className, children, ...props }: LinkProps & ButtonLook) {
  return (
    <Link className={buttonClass(variant, size, className)} {...props}>
      <ButtonIcon icon={icon} size={size} />
      {children}
    </Link>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cx("panel p-5 sm:p-6", className)}>{children}</section>;
}

export function PanelHeader({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

export function Banner({
  tone = "danger",
  children,
  onDismiss,
}: {
  tone?: "danger" | "warn" | "info" | "success";
  children: ReactNode;
  onDismiss?: () => void;
}) {
  const tones = {
    danger: "border-danger/30 bg-danger/10 text-danger",
    warn: "border-warn/30 bg-warn/10 text-warn",
    info: "border-sky/30 bg-sky/10 text-sky",
    success: "border-accent/30 bg-accent/10 text-accent",
  };
  const icon: IconName = tone === "success" ? "check" : tone === "info" ? "wave" : "alert";
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cx("flex items-start gap-3 rounded-xl border px-4 py-3 text-sm", tones[tone])}>
      <Icon name={icon} className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1 text-ink/90">{children}</div>
      {onDismiss && (
        <button onClick={onDismiss} className="cursor-pointer opacity-70 hover:opacity-100" aria-label="Dismiss">
          <Icon name="close" className="size-4" />
        </button>
      )}
    </div>
  );
}

export function Spinner({ className = "size-5" }: { className?: string }) {
  return <span className={cx("inline-block animate-spin rounded-full border-2 border-current border-r-transparent", className)} />;
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: IconName;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-raised text-muted">
        <Icon name={icon} className="size-6" />
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {children && <p className="mt-1 max-w-sm text-sm text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-xl border border-line bg-raised p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx(
            "cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            o.value === value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
        <rect width="32" height="32" rx="9" className="fill-accent" />
        <g className="fill-accent-ink">
          <rect x="7" y="13" width="3" height="6" rx="1.5" />
          <rect x="12" y="9" width="3" height="14" rx="1.5" />
          <rect x="17" y="6" width="3" height="20" rx="1.5" />
          <rect x="22" y="11" width="3" height="10" rx="1.5" />
        </g>
      </svg>
      <span className="font-display text-xl font-bold tracking-tight">sonic</span>
    </span>
  );
}

export function CategoryDot({ category }: { category: string }) {
  const color =
    category === "strength" ? "bg-accent" : category === "cardio" ? "bg-sky" : category === "mobility" ? "bg-violet" : "bg-faint";
  return <span className={cx("inline-block size-2 shrink-0 rounded-full", color)} aria-hidden="true" />;
}
