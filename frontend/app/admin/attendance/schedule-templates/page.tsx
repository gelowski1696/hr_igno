import { ResourcePage } from "@/components/resource/resource-page";
import { scheduleTemplateResource } from "@/lib/resources";

export default function ScheduleTemplatesPage() {
  return <ResourcePage config={scheduleTemplateResource} />;
}

