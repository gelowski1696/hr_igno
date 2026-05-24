"use client";

import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  CalendarCheck2,
  CalendarClock,
  CalendarRange,
  CircleDollarSign,
  ChevronDown,
  ClipboardPenLine,
  Clock3,
  FolderOpen,
  FileBarChart2,
  Gift,
  HandCoins,
  House,
  Landmark,
  LayoutDashboard,
  LucideIcon,
  PanelLeftClose,
  PanelLeftOpen,
  PiggyBank,
  PlaneTakeoff,
  ReceiptText,
  Scale,
  ShieldCheck,
  Store,
  Tags,
  Timer,
  Users2,
  UsersRound,
  WalletCards
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useEffect, useState } from "react";

import { filterNavigation, navigationSections, type NavigationItem } from "@/lib/navigation";
import type { UserRole } from "@/lib/types";
import { APP_BRAND } from "@/lib/brand";

const icons: Record<string, LucideIcon> = {
  Banknote,
  AlertTriangle,
  CalendarClock,
  CalendarCheck2,
  CalendarDays,
  CalendarRange,
  CircleDollarSign,
  ClipboardPenLine,
  Clock3,
  FileBarChart2,
  FolderOpen,
  Gift,
  HandCoins,
  House,
  Landmark,
  LayoutDashboard,
  PiggyBank,
  PlaneTakeoff,
  ReceiptText,
  Scale,
  ShieldCheck,
  Store,
  Tags,
  Timer,
  Users2,
  UsersRound,
  WalletCards
};

export function Sidebar({
  role,
  collapsed,
  onToggle
}: {
  role: UserRole;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const sections = filterNavigation(navigationSections, role);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const activeGroupLabels = sections.flatMap((section) =>
    section.items
      .filter((item) => item.children?.length && containsPath(item, pathname))
      .map((item) => item.label)
  );
  const activeGroupKey = activeGroupLabels.join("|");

  useEffect(() => {
    if (!activeGroupLabels.length) return;

    setOpenGroups((previous) => {
      let changed = false;
      const next = { ...previous };

      for (const label of activeGroupLabels) {
        if (!next[label]) {
          next[label] = true;
          changed = true;
        }
      }

      return changed ? next : previous;
    });
  }, [activeGroupKey]);

  function toggleGroup(label: string) {
    setOpenGroups((previous) => ({ ...previous, [label]: !previous[label] }));
  }

  return (
    <aside
      className={clsx(
        "hidden shrink-0 border-r-[1.5px] border-line bg-muted transition-[width] duration-200 lg:block",
        collapsed ? "w-[72px]" : "w-[248px]"
      )}
    >
      <div className="sticky top-0 flex h-screen flex-col">
        <div
          className={clsx(
            "flex min-h-16 items-center border-b-[1.5px] border-line",
            collapsed ? "justify-center px-2" : "justify-between px-4"
          )}
        >
          {!collapsed ? (
            <div className="min-w-0">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">{APP_BRAND.shortName}</div>
              <div className="font-slab text-2xl font-bold leading-7 text-ink">{APP_BRAND.productName}</div>
            </div>
          ) : null}
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center border-[1.5px] border-strongline bg-field text-brand-600 transition hover:bg-brand-50"
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
        <nav className={clsx("min-h-0 flex-1 overflow-y-auto py-4", collapsed ? "px-2" : "px-3")}>
          {sections.map((section) => (
            <div key={section.label} className="mb-5">
              <div
                className={clsx(
                  "mb-2 px-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500",
                  collapsed && "sr-only"
                )}
              >
                {section.label}
              </div>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = icons[item.icon] || LayoutDashboard;
                  const hasChildren = Boolean(item.children?.length);
                  const groupOpen = openGroups[item.label] ?? false;
                  const active = item.href ? pathname === item.href || pathname.startsWith(`${item.href}/`) : false;
                  const groupActive = hasChildren && containsPath(item, pathname);

                  return (
                    <div key={item.label}>
                      {hasChildren && !collapsed ? (
                        <button
                          type="button"
                          onClick={() => toggleGroup(item.label)}
                          className={clsx(
                            "flex min-h-10 w-full items-center gap-3 border-l-[3px] px-3 py-2 text-left text-sm font-semibold transition",
                            groupActive
                              ? "border-brand-600 bg-brand-50 text-brand-700"
                              : "border-transparent text-slate-600 hover:bg-white hover:text-ink",
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span className="truncate">{item.label}</span>
                          <ChevronDown className={clsx("ml-auto h-4 w-4 transition", groupOpen ? "rotate-180" : "")} />
                        </button>
                      ) : item.href ? (
                        <Link
                          href={item.href}
                          title={collapsed ? item.label : undefined}
                          aria-label={item.label}
                          className={clsx(
                            "flex min-h-10 items-center gap-3 border-l-[3px] px-3 py-2 text-sm font-semibold transition",
                            collapsed && "justify-center px-2",
                            active
                              ? "border-brand-600 bg-brand-600 text-white"
                              : "border-transparent text-slate-600 hover:bg-white hover:text-ink",
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          {!collapsed ? <span className="truncate">{item.label}</span> : null}
                        </Link>
                      ) : (
                        <div
                          className={clsx(
                            "flex min-h-10 items-center gap-3 border-l-[3px] px-3 py-2 text-sm font-semibold",
                            collapsed && "justify-center px-2",
                            "border-transparent text-slate-600",
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                          {!collapsed ? <span className="truncate">{item.label}</span> : null}
                        </div>
                      )}

                      {hasChildren && !collapsed && groupOpen ? (
                        <div className="ml-4 mt-1 space-y-1 border-l border-line/70 pl-2.5">
                          {item.children?.map((child) => {
                            const ChildIcon = icons[child.icon] || LayoutDashboard;
                            const childActive = child.href ? pathname === child.href : false;
                            if (!child.href) return null;

                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={clsx(
                                  "flex min-h-9 items-center gap-2 border-l-[2px] px-2.5 py-1.5 text-sm font-medium transition",
                                  childActive
                                    ? "border-brand-600 bg-brand-600 text-white"
                                    : "border-transparent text-slate-600 hover:bg-white hover:text-ink",
                                )}
                              >
                                <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{child.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}

function containsPath(item: NavigationItem, pathname: string): boolean {
  if (item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`))) {
    return true;
  }
  return item.children?.some((child) => containsPath(child, pathname)) ?? false;
}
