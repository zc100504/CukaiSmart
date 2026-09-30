import { CheckCircle2, Download, FilePenLine, FileUp, History, ScanText, ShieldCheck } from 'lucide-react';
import { formatDateTime } from '../data/format.js';

const ICONS = {
  uploaded: FileUp,
  extracted: ScanText,
  field_edited: FilePenLine,
  field_confirmed: CheckCircle2,
  approved: CheckCircle2,
  marked_ready: ShieldCheck,
  submitted: ShieldCheck,
  exported: Download,
};

export default function AuditTrail({ events }) {
  if (!events.length) return <div className="audit-trail__empty"><History size={22} aria-hidden="true" /><p>No audit activity is available for this document yet.</p></div>;
  const ordered = [...events].sort((a, b) => b.at.localeCompare(a.at));
  return <div className="audit-trail"><p className="text-caption">Newest activity first · {ordered.length} {ordered.length === 1 ? 'event' : 'events'}</p><ol>
    {ordered.map((event) => {
      const Icon = ICONS[event.action] || History;
      return <li key={event.id} className="audit-trail__event"><span className="audit-trail__icon" aria-hidden="true"><Icon size={17} /></span><div><strong>{event.message}</strong><p className="text-caption">{event.actor} · {formatDateTime(event.at)}</p>{event.field && <p className="text-caption">Field: {event.field}</p>}{event.before != null && event.after != null && <p className="audit-trail__change"><span>{event.before}</span><span aria-hidden="true">→</span><strong>{event.after}</strong></p>}</div></li>;
    })}
  </ol></div>;
}
