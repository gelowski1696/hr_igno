"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarClock, CircleDollarSign, Landmark, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";

import { getMyCashAdvances } from "@/lib/api";
import { formatCell, humanize } from "@/lib/formatters";
import {
  EmployeeErrorState,
  EmployeePageIntro,
  EmployeePageLoadingSkeleton,
  EmployeeSection,
  EmployeeStatCard,
  EmployeeTable,
} from "@/components/employee/employee-primitives";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

type LoanFilter = "all" | "cash-advance" | "loan" | "benefit";

export default function EmployeeLoansPage() {
  const [filter, setFilter] = useState<LoanFilter>("all");

  const advancesQuery = useQuery({
    queryKey: ["employee", "cash-advances"],
    queryFn: getMyCashAdvances,
  });

  const rows = useMemo(() => advancesQuery.data || [], [advancesQuery.data]);

  const filteredRows = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "cash-advance") {
      return rows.filter((row) => String(row.type || "").toLowerCase() === "cash advance");
    }
    if (filter === "loan") {
      return rows.filter((row) => String(row.type || "").toLowerCase() === "loan");
    }
    return rows.filter((row) => ["sss loan", "pag-ibig loan", "philhealth loan"].includes(String(row.type || "").toLowerCase()));
  }, [filter, rows]);

  const openRows = useMemo(
    () =>
      rows.filter((row) => {
        const status = String(row.status || "").toUpperCase();
        const balance = Number(row.balance || 0);
        return (status === "APPROVED" || status === "PARTIAL") && balance > 0;
      }),
    [rows],
  );

  const totalReleased = useMemo(() => rows.reduce((sum, row) => sum + Number(row.totalAmount || row.amount || 0), 0), [rows]);
  const totalBalance = useMemo(() => openRows.reduce((sum, row) => sum + Number(row.balance || 0), 0), [openRows]);
  const totalPaid = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.totalPaid || 0), 0),
    [rows],
  );

  if (advancesQuery.isLoading) {
    return <EmployeePageLoadingSkeleton />;
  }

  if (advancesQuery.isError) {
    return <EmployeeErrorState message={(advancesQuery.error as Error).message || "Unable to load advances and loans."} />;
  }

  return (
    <section className="w-full space-y-5">
      <EmployeePageIntro
        title="My Loans"
        description="Review your cash advances, loans, balances, and payment progress."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <EmployeeStatCard
          label="Total Records"
          value={String(rows.length)}
          hint="All released entries."
          icon={<WalletCards className="h-4 w-4" />}
        />
        <EmployeeStatCard
          label="Outstanding"
          value={formatCell(totalBalance, "currency")}
          hint={`${openRows.length} open record(s).`}
          icon={<Landmark className="h-4 w-4" />}
          tone={totalBalance > 0 ? "amber" : "green"}
        />
        <EmployeeStatCard
          label="Total Released"
          value={formatCell(totalReleased, "currency")}
          hint="Original approved amount."
          icon={<CircleDollarSign className="h-4 w-4" />}
          tone="brand"
        />
        <EmployeeStatCard
          label="Total Paid"
          value={formatCell(totalPaid, "currency")}
          hint="Recorded payment amount."
          icon={<CalendarClock className="h-4 w-4" />}
          tone="green"
        />
      </section>

      <EmployeeSection title="Advances and Loans" icon={<Landmark className="h-4 w-4 text-brand-600" />} subtitle={`${filteredRows.length} record(s)`}>
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-3 sm:px-4">
          <FilterButton active={filter === "all"} onClick={() => setFilter("all")} label="All" />
          <FilterButton active={filter === "cash-advance"} onClick={() => setFilter("cash-advance")} label="Cash Advance" />
          <FilterButton active={filter === "loan"} onClick={() => setFilter("loan")} label="Loan" />
          <FilterButton active={filter === "benefit"} onClick={() => setFilter("benefit")} label="Benefit Loans" />
        </div>

        <EmployeeTable
          columns={[
            { key: "type", label: "Type", render: (row) => humanize(String(row.type || "-")) },
            { key: "atd", label: "ATD", render: (row) => String(row.atd || "-") },
            { key: "issued", label: "Date Issued", render: (row) => formatCell(row.dateIssued, "date") },
            { key: "amount", label: "Amount", render: (row) => formatCell(row.totalAmount || row.amount, "currency") },
            { key: "paid", label: "Paid", render: (row) => formatCell(row.totalPaid, "currency") },
            { key: "balance", label: "Balance", render: (row) => formatCell(row.balance, "currency") },
            {
              key: "status",
              label: "Status",
              render: (row) => <StatusBadge value={row.status || "PENDING"} />,
            },
            {
              key: "due",
              label: "Due Date",
              hideOnMobile: true,
              render: (row) => formatCell(row.repaymentDue, "date"),
            },
          ]}
          rows={filteredRows as Array<Record<string, unknown>>}
          emptyLabel="No loan or cash advance records found."
          renderCardTitle={(row) => humanize(String(row.type || "Loan"))}
          renderCardMeta={(row) => formatCell(row.dateIssued, "date")}
          mobilePriorityKeys={["balance", "status", "amount", "atd"]}
          mobileFieldLimit={4}
        />
      </EmployeeSection>
    </section>
  );
}

function FilterButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <Button
      variant={active ? "primary" : "secondary"}
      className="h-9 px-3"
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
