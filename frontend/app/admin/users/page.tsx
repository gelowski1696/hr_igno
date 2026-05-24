import { ResourcePage } from "@/components/resource/resource-page";
import { userResource } from "@/lib/resources";

export default function UsersPage() {
  return <ResourcePage config={userResource} />;
}
