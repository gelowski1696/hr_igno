"use client";

import { LogOut, Menu, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/brand";
import { filterNavigation, navigationSections } from "@/lib/navigation";
import { getStoredSidebarCollapsed, setStoredSidebarCollapsed } from "@/lib/sidebar-preferences";
import type { SessionUser } from "@/lib/types";
import { useAuth } from "@/components/providers/auth-provider";
import { Sidebar } from "./sidebar";

export function DashboardShell({ children, user }: { children: ReactNode; user: SessionUser }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const sections = filterNavigation(navigationSections, user.role);

  useEffect(() => {
    setSidebarCollapsed(getStoredSidebarCollapsed());
  }, []);

  function toggleSidebar() {
    setSidebarCollapsed((value) => {
      const next = !value;
      setStoredSidebarCollapsed(next);
      return next;
    });
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-paper text-ink">
      <div className="flex min-h-screen">
        <Sidebar role={user.role} collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b-[1.5px] border-line bg-paper/95 backdrop-blur">
            <div className="flex min-h-16 items-center justify-between gap-3 px-3 py-2 sm:px-5 lg:px-6">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center border-[1.5px] border-line bg-field text-slate-700 lg:hidden"
                onClick={() => setMenuOpen((value) => !value)}
                aria-label="Toggle navigation"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
                  {user.role.replace(/_/g, " ")}
                </p>
                <h1 className="truncate font-slab text-lg font-bold leading-6 text-ink sm:text-xl">{APP_NAME} workspace</h1>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden items-center gap-2 border-[1.5px] border-line bg-field px-3 py-2 text-sm font-medium text-slate-700 sm:flex">
                  <UserRound className="h-4 w-4" />
                  <span className="max-w-40 truncate">{user.username}</span>
                </div>
                <Button variant="secondary" icon={<LogOut className="h-4 w-4" />} onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </div>
            {menuOpen ? (
              <nav className="border-t-[1.5px] border-line bg-muted px-3 py-3 lg:hidden">
                {sections.map((section) => (
                  <div key={section.label} className="mb-3">
                    <div className="mb-1 px-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                      {section.label}
                    </div>
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                      {section.items.map((item) =>
                        item.children?.length ? (
                          <div key={item.label} className="rounded-md border border-line/70 bg-white/70 p-2">
                            <div className="mb-1 px-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                              {item.label}
                            </div>
                            <div className="grid grid-cols-1 gap-1">
                              {item.children.map((child) => {
                                if (!child.href) return null;
                                const active = pathname === child.href;
                                return (
                                  <Link
                                    key={child.href}
                                    href={child.href}
                                    onClick={() => setMenuOpen(false)}
                                    className={
                                      active
                                        ? "border-l-[3px] border-brand-600 bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
                                        : "border-l-[3px] border-transparent px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
                                    }
                                  >
                                    {child.label}
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        ) : item.href ? (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMenuOpen(false)}
                            className={
                              pathname === item.href
                                ? "border-l-[3px] border-brand-600 bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
                                : "border-l-[3px] border-transparent px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
                            }
                          >
                            {item.label}
                          </Link>
                        ) : null
                      )}
                    </div>
                  </div>
                ))}
              </nav>
            ) : null}
          </header>
          <main className="flex-1 px-3 py-4 sm:px-5 sm:py-5 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
