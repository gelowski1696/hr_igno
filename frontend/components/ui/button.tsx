import type { ButtonHTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: ReactNode;
};

const variants = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-600",
  secondary: "border-[1.5px] border-brand-600 bg-field text-brand-600 hover:bg-brand-50 hover:text-brand-700",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-ink",
  danger: "bg-signal-red text-white hover:bg-red-700 focus-visible:ring-signal-red"
};

export function Button({ className, children, icon, variant = "primary", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        "inline-flex h-9 items-center justify-center gap-2 border border-transparent px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-inherit",
        variants[variant],
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
