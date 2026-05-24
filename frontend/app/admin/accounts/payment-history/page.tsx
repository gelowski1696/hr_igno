import { ResourcePage } from "@/components/resource/resource-page";
import { paymentHistoryResource } from "@/lib/resources";

export default function PaymentHistoryPage() {
  return (
    <ResourcePage
      config={paymentHistoryResource}
      listEndpointOverride="cash-advances/payment-history?type=Loan,SSS%20Loan,PAG-IBIG%20Loan,PHILHEALTH%20Loan&status=PAID"
      allowCreate={false}
      allowEdit={false}
      allowDelete={false}
    />
  );
}
