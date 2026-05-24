import { ResourcePage } from "@/components/resource/resource-page";
import { benefitLoanResource } from "@/lib/resources";

export default function BenefitLoansPage() {
  return (
    <ResourcePage
      config={benefitLoanResource}
      listEndpointOverride="cash-advances?type=SSS%20Loan,PAG-IBIG%20Loan,PHILHEALTH%20Loan"
      enableAmortization
    />
  );
}
