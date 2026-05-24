"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { PlannedPage } from "./planned-page";

export function SelfServicePage({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  const { user } = useAuth();

  return (
    <PlannedPage eyebrow="Employee" title={title} description={description}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Account</p>
          <p className="mt-1 font-semibold text-ink">{user?.username || "-"}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Employee ID</p>
          <p className="mt-1 font-mono font-semibold text-ink">{user?.employeeId || "-"}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Store ID</p>
          <p className="mt-1 font-mono font-semibold text-ink">{user?.storeId || "-"}</p>
        </div>
      </div>
    </PlannedPage>
  );
}
