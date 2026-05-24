import { ResourcePage } from "@/components/resource/resource-page";
import { leaveTypeResource } from "@/lib/resources";

export default function LeaveTypesPage() {
  return <ResourcePage config={leaveTypeResource} />;
}
