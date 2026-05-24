import { ResourcePage } from "@/components/resource/resource-page";
import { perksResource } from "@/lib/resources";

export default function EmployeePerksPage() {
  return <ResourcePage config={perksResource} />;
}

