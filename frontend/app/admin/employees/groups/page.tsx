import { ResourcePage } from "@/components/resource/resource-page";
import { employeeGroupResource } from "@/lib/resources";

export default function EmployeeGroupsPage() {
  return <ResourcePage config={employeeGroupResource} />;
}

