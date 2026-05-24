import { ResourcePage } from "@/components/resource/resource-page";
import { leaveResource } from "@/lib/resources";

export default function LeaveRequestsPage() {
  return <ResourcePage config={leaveResource} />;
}
