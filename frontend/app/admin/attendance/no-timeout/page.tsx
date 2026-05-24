import { ResourcePage } from "@/components/resource/resource-page";
import { attendanceResource } from "@/lib/resources";

export default function AttendanceNoTimeOutPage() {
  return (
    <ResourcePage
      config={{
        ...attendanceResource,
        title: "No Time-out",
        description: "Review employees with a time-in record that still has no time-out.",
        searchPlaceholder: "Search employee ID, employee name, location",
        emptyLabel: "No open no-time-out records found.",
        dateRangeFilter: {
          enabled: true,
          fromParam: "from",
          toParam: "to",
        },
        createLabel: "Set Time Out",
        formPanelClassName: "max-w-[560px]",
        columns: [
          { key: "employee.employeeCode", header: "ID" },
          { key: "employee", header: "Employee Name", type: "person" },
          { key: "createdAt", header: "Date", type: "date" },
          { key: "timeIn", header: "Time In", type: "time" },
          { key: "timeOut", header: "Time Out", type: "time" },
          { key: "locationIn", header: "Location In", hideOnMobile: true },
          { key: "source", header: "Source", type: "status", hideOnMobile: true }
        ],
        formFields: [
          { name: "createdDate", label: "Date", type: "date", required: true },
          { name: "timeOutClock", label: "Time Out", type: "time", required: true },
          { name: "manualReason", label: "Reason", type: "textarea" }
        ],
      }}
      endpointOverride="attendance"
      listEndpointOverride="attendance/no-timeout"
      allowCreate={false}
      allowDelete={false}
      allowEdit
    />
  );
}
