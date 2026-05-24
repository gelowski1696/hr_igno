"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { defaultPathForRole } from "@/lib/navigation";
import type { UserRole } from "@/lib/types";
import { DashboardShell } from "./dashboard-shell";

export function ProtectedShell({ allowedRoles, children }: { allowedRoles: UserRole[]; children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!allowedRoles.includes(user.role)) {
      router.replace(defaultPathForRole(user.role));
    }
  }, [allowedRoles, isLoading, pathname, router, user]);

  if (isLoading || !user || !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-paper p-3 sm:p-6">
        <div className="w-full space-y-4">
          <Skeleton className="h-12 w-72 border border-line" />
          <Skeleton className="h-64 w-full border border-line" />
          <Skeleton className="h-64 w-full border border-line" />
        </div>
      </div>
    );
  }

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
