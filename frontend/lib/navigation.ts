import type { UserRole } from "./types";

export type NavigationItem = {
  label: string;
  href?: string;
  icon: string;
  roles: UserRole[];
  children?: NavigationItem[];
};

export type NavigationSection = {
  label: string;
  items: NavigationItem[];
};

const adminRoles: UserRole[] = ["SUPER_ADMIN", "ADMIN"];

export const navigationSections: NavigationSection[] = [
  {
    label: "Operations",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: "LayoutDashboard", roles: adminRoles },
      {
        label: "Employees",
        href: "/admin/employees",
        icon: "UsersRound",
        roles: adminRoles,
        children: [
          { label: "Lists", href: "/admin/employees", icon: "UsersRound", roles: adminRoles },
          { label: "Employee Groups", href: "/admin/employees/groups", icon: "Users2", roles: adminRoles },
          { label: "Employee Perks", href: "/admin/employees/perks", icon: "Gift", roles: adminRoles },
          { label: "Employee Funds", href: "/admin/employees/funds", icon: "HandCoins", roles: adminRoles },
        ],
      },
      {
        label: "Attendance",
        href: "/admin/attendance/today",
        icon: "Clock3",
        roles: adminRoles,
        children: [
          { label: "Today", href: "/admin/attendance/today", icon: "Clock3", roles: adminRoles },
          { label: "Time Log", href: "/admin/attendance/timelog", icon: "CalendarDays", roles: adminRoles },
          { label: "No Time-out", href: "/admin/attendance/no-timeout", icon: "Clock3", roles: adminRoles },
          { label: "Manual Time", href: "/admin/attendance/manual", icon: "ClipboardPenLine", roles: adminRoles },
          { label: "Schedules", href: "/admin/attendance/schedules", icon: "CalendarRange", roles: adminRoles },
          { label: "Schedule Templates", href: "/admin/attendance/schedule-templates", icon: "CalendarClock", roles: adminRoles },
        ],
      },
      { label: "Stores", href: "/admin/stores", icon: "Store", roles: adminRoles }
    ]
  },
  {
    label: "People",
    items: [
      {
        label: "Leave Management",
        href: "/admin/leaves/requests",
        icon: "PlaneTakeoff",
        roles: adminRoles,
        children: [
          { label: "Leave Requests", href: "/admin/leaves/requests", icon: "PlaneTakeoff", roles: adminRoles },
          { label: "Leave Balances", href: "/admin/leaves/balances", icon: "Scale", roles: adminRoles },
          { label: "Leave Types", href: "/admin/leaves/types", icon: "Tags", roles: adminRoles },
        ],
      },
      { label: "Users", href: "/admin/users", icon: "ShieldCheck", roles: adminRoles },
      { label: "Files", href: "/admin/files", icon: "FolderOpen", roles: adminRoles }
    ]
  },
  {
    label: "Payroll",
    items: [
      {
        label: "Payroll",
        href: "/admin/payroll/runs",
        icon: "Banknote",
        roles: adminRoles,
        children: [
          { label: "Payroll Runs", href: "/admin/payroll/runs", icon: "Banknote", roles: adminRoles },
          { label: "Payslips", href: "/admin/payroll/payslips", icon: "ReceiptText", roles: adminRoles },
        ],
      },
      {
        label: "Transactions",
        href: "/admin/accounts/cash-advances",
        icon: "WalletCards",
        roles: adminRoles,
        children: [
          { label: "Cash Advances", href: "/admin/accounts/cash-advances", icon: "WalletCards", roles: adminRoles },
          { label: "Loans", href: "/admin/accounts/loans", icon: "Landmark", roles: adminRoles },
          { label: "Benefit Loans", href: "/admin/accounts/benefit-loans", icon: "Landmark", roles: adminRoles },
          { label: "Payment History", href: "/admin/accounts/payment-history", icon: "History", roles: adminRoles },
        ],
      },
    ]
  },
  {
    label: "Reports",
    items: [
      {
        label: "Reports",
        href: "/admin/reports/attendance-summary",
        icon: "FileBarChart2",
        roles: adminRoles,
        children: [
          { label: "Attendance Summary", href: "/admin/reports/attendance-summary", icon: "FileBarChart2", roles: adminRoles },
          { label: "Attendance Exceptions", href: "/admin/reports/attendance-exceptions", icon: "AlertTriangle", roles: adminRoles },
          { label: "Late & Overtime", href: "/admin/reports/late-overtime", icon: "Timer", roles: adminRoles },
          { label: "Leave Utilization", href: "/admin/reports/leave-utilization", icon: "CalendarCheck2", roles: adminRoles },
          { label: "Payroll Cost", href: "/admin/reports/payroll-cost", icon: "CircleDollarSign", roles: adminRoles },
          { label: "Loans & Aging", href: "/admin/reports/loans-aging", icon: "Landmark", roles: adminRoles },
        ],
      },
    ],
  },
  {
    label: "Employee",
    items: [
      { label: "My Dashboard", href: "/employee/dashboard", icon: "House", roles: ["EMPLOYEE"] },
      { label: "My Attendance", href: "/employee/attendance", icon: "Clock3", roles: ["EMPLOYEE"] },
      { label: "My Leaves", href: "/employee/leaves", icon: "PlaneTakeoff", roles: ["EMPLOYEE"] },
      { label: "My Payroll", href: "/employee/payroll", icon: "ReceiptText", roles: ["EMPLOYEE"] },
      { label: "My Loans", href: "/employee/loans", icon: "WalletCards", roles: ["EMPLOYEE"] }
    ]
  }
];

export function filterNavigation(sections: NavigationSection[], role: UserRole) {
  function filterItems(items: NavigationItem[]): NavigationItem[] {
    return items
      .map((item) => {
        const children = item.children ? filterItems(item.children) : undefined;
        const allowed = item.roles.includes(role);

        if (children && children.length > 0) {
          return {
            ...item,
            children,
          };
        }

        if (!allowed || !item.href) {
          return null;
        }

        return {
          ...item,
          children: undefined,
        };
      })
      .filter((item): item is NavigationItem => Boolean(item));
  }

  return sections
    .map((section) => ({
      ...section,
      items: filterItems(section.items)
    }))
    .filter((section) => section.items.length > 0);
}

export function flattenNavigationItems(items: NavigationItem[], includeBranches = false): NavigationItem[] {
  return items.flatMap((item) => {
    const children = item.children ? flattenNavigationItems(item.children, includeBranches) : [];
    const isBranch = Boolean(item.children?.length);
    if (isBranch && !includeBranches) {
      return children;
    }
    return [item, ...children];
  });
}

export function defaultPathForRole(role: UserRole) {
  return role === "EMPLOYEE" ? "/employee/dashboard" : "/admin/dashboard";
}
