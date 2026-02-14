import type { ApplicationStatus } from '../../types';
import { STATUS_STYLES } from '../../constants/status';

export default function StatusBadge({ status }: { status: ApplicationStatus }) {
  const style = STATUS_STYLES[status];
  const isActive = status === 'pending' || status === 'under_review';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot} ${isActive ? 'animate-pulse' : ''}`} />
      {style.label}
    </span>
  );
}
