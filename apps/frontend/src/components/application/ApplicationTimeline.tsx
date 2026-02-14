import { formatDateTime } from '../../lib/formatters';

interface TimelineEvent { id: string; eventType: string; eventData: Record<string, unknown>; createdAt: string }

export default function ApplicationTimeline({ events }: { events: TimelineEvent[] }) {
  if (!events.length) return <p className="text-gray-500 text-sm">No events yet.</p>;
  return (
    <div className="space-y-4">
      {events.map((e) => (
        <div key={e.id} className="flex gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
          <div>
            <p className="text-sm font-medium">{e.eventType.replace(/_/g, ' ')}</p>
            <p className="text-xs text-gray-500">{formatDateTime(e.createdAt)}</p>
            {e.eventData && <pre className="text-xs text-gray-400 mt-1">{JSON.stringify(e.eventData, null, 2)}</pre>}
          </div>
        </div>
      ))}
    </div>
  );
}
