import { ResourcePage } from "@/components/resource/resource-page";
import { attendanceResource } from "@/lib/resources";

export default function AttendanceTimeLogPage() {
  return (
    <ResourcePage
      config={{
        ...attendanceResource,
        title: "Time Log",
        description: "Review employee time-in and time-out logs with clock-in and clock-out locations.",
        searchPlaceholder: "Search employee ID, first name, last name, location",
        emptyLabel: "No attendance logs found for the selected date range.",
        dateRangeFilter: {
          enabled: true,
          fromParam: "from",
          toParam: "to",
        },
        columns: [
          { key: "employee.employeeCode", header: "ID" },
          { key: "employee.firstName", header: "First Name" },
          { key: "employee.lastName", header: "Last Name" },
          { key: "timeIn", header: "Time In", type: "datetime" },
          { key: "locationIn", header: "Location In", hideOnMobile: true },
          { key: "timeOut", header: "Time Out", type: "datetime" },
          { key: "locationOut", header: "Location Out", hideOnMobile: true },
        ],
      }}
      allowCreate={false}
      allowEdit={false}
      allowDelete={false}
    />
  );
}
