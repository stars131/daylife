import { notFound } from "next/navigation";
import { EventForm } from "@/components/event-form";
import { getAppTimezone } from "@/lib/env";
import { getEvent } from "@/lib/event-service";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  try {
    const event = await getEvent(params.id);
    return (
      <div className="space-y-4">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-lg font-semibold text-ink">编辑事项</h1>
          <p className="text-sm text-muted">{event.id}</p>
        </div>
        <EventForm event={event} timezone={getAppTimezone()} />
      </div>
    );
  } catch {
    notFound();
  }
}
