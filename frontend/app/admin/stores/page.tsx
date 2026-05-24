import { ResourcePage } from "@/components/resource/resource-page";
import { storeResource } from "@/lib/resources";

export default function StoresPage() {
  return <ResourcePage config={storeResource} />;
}
