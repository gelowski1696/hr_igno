import { ResourcePage } from "@/components/resource/resource-page";
import { leaveBalanceResource } from "@/lib/resources";

export default function LeaveBalancesPage() {
  return <ResourcePage config={leaveBalanceResource} />;
}
