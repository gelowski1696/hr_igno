import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { clsx } from "clsx";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      suppressHydrationWarning
      className={clsx(
        "h-9 w-full border-[1.5px] border-strongline bg-field px-3 text-sm font-medium text-ink outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/30 disabled:border-line disabled:bg-muted",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      suppressHydrationWarning
      className={clsx(
        "min-h-24 w-full border-[1.5px] border-strongline bg-field px-3 py-2 text-sm font-medium text-ink outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/30 disabled:border-line disabled:bg-muted",
        className
      )}
      {...props}
    />
  );
}
