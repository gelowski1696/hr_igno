import { ResourcePage } from "@/components/resource/resource-page";
import { cashAdvanceResource } from "@/lib/resources";

export default function CashAdvancesPage() {
  return <ResourcePage config={cashAdvanceResource} listEndpointOverride="cash-advances?type=Cash%20Advance" />;
}
