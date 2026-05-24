import type { ReactNode } from "react";

import { ProtectedShell } from "@/components/layout/protected-shell";

export default function EmployeeLayout({ children }: { children: ReactNode }) {
  return <ProtectedShell allowedRoles={["EMPLOYEE"]}>{children}</ProtectedShell>;
}
