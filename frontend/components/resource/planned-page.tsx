import type { ReactNode } from "react";

export function PlannedPage({
  eyebrow,
  title,
  description,
  children
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="w-full">
      <div className="border-b-[1.5px] border-line pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">{eyebrow}</p>
        <h2 className="mt-1 font-slab text-[25px] font-bold leading-8 text-ink sm:text-[28px] sm:leading-9">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <div className="mt-5 border-[1.5px] border-line bg-field p-4 text-sm leading-6 text-slate-700 sm:p-5">
        {children || "This workflow is available as a focused route for the next build stage."}
      </div>
    </section>
  );
}
