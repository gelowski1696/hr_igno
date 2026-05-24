import { ResourcePage } from "@/components/resource/resource-page";
import { employeeResource } from "@/lib/resources";

export default function EmployeesPage() {
  return <ResourcePage config={employeeResource} />;
}
