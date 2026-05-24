import type { ReactNode } from "react";

import { ProtectedShell } from "@/components/layout/protected-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <ProtectedShell allowedRoles={["SUPER_ADMIN", "ADMIN"]}>{children}</ProtectedShell>;
}
