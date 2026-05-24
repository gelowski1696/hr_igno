import { ResourcePage } from "@/components/resource/resource-page";
import { loanResource } from "@/lib/resources";

export default function LoansPage() {
  return <ResourcePage config={loanResource} listEndpointOverride="cash-advances?type=Loan" enableAmortization />;
}
