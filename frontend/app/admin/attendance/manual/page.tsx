import { ResourcePage } from "@/components/resource/resource-page";
import { attendanceResource } from "@/lib/resources";

export default function ManualAttendancePage() {
  return (
    <ResourcePage
      config={{
        ...attendanceResource,
        title: "Manual Attendance",
        description: "Create and review manual time entries.",
        searchPlaceholder: "Search employee ID, employee name, encoder",
        emptyLabel: "No manual attendance logs found for the selected date range.",
        createLabel: "Add",
        formPanelClassName: "max-w-[620px]",
        dateRangeFilter: {
          enabled: true,
          fromParam: "from",
          toParam: "to",
        },
        columns: [
          { key: "employee.employeeCode", header: "ID" },
          { key: "employee", header: "Employee Name", type: "person" },
          { key: "createdAt", header: "Date", type: "date" },
          { key: "timeIn", header: "Time In", type: "time" },
          { key: "timeOut", header: "Time Out", type: "time" },
          { key: "encoder", header: "Encoder" }
        ],
        formFields: [
          { name: "employeeId", label: "Employee", type: "select", required: true, coerceNumber: true },
          { name: "createdDate", label: "Date", type: "date", required: true },
          { name: "timeInClock", label: "Time In", type: "time", required: true },
          { name: "timeOutClock", label: "Time Out", type: "time", required: true }
        ]
      }}
      listEndpointOverride="attendance?source=ADMIN_MANUAL"
      allowEdit={false}
    />
  );
}
