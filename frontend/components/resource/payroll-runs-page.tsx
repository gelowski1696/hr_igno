"use client";

import { Users } from "lucide-react";
import { useState } from "react";

import { payrollResource } from "@/lib/resources";
import { Button } from "@/components/ui/button";
import { PayrollBulkGenerateDialog } from "./payroll-bulk-generate-dialog";
import { ResourcePage } from "./resource-page";

export function PayrollRunsView() {
  const [bulkOpen, setBulkOpen] = useState(false);

  return (
    <>
      <ResourcePage
        config={payrollResource}
        toolbarActions={
          <Button
            variant="secondary"
            className="h-10 rounded-md px-4"
            icon={<Users className="h-4 w-4" />}
            onClick={() => setBulkOpen(true)}
          >
            Group payroll
          </Button>
        }
      />
      <PayrollBulkGenerateDialog open={bulkOpen} onClose={() => setBulkOpen(false)} />
    </>
  );
}
