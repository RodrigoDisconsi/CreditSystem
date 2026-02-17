import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { VALID_STATUS_TRANSITIONS } from '@credit-system/shared';
import { useApplication } from '../hooks/useApplication';
import { useAuth } from '../hooks/useAuth';
import ApplicationInfo from '../components/application/ApplicationInfo';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import StatusBadge from '../components/application/StatusBadge';
import { updateApplicationStatus } from '../services/applicationApi';
import type { ApplicationStatus } from '../types';

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { application, isLoading, error, refetch } = useApplication(id!);
  const { user } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const canUpdateStatus = user && (user.role === 'admin' || user.role === 'analyst');

  const handleStatusUpdate = async (newStatus: ApplicationStatus) => {
    if (!application) return;
    setUpdating(true);
    setUpdateError(null);
    try {
      await updateApplicationStatus(application.id, newStatus);
      await refetch();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      setUpdateError(message);
    } finally {
      setUpdating(false);
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!application) return <div className="text-gray-500">Application not found</div>;

  const availableTransitions = VALID_STATUS_TRANSITIONS[application.status] || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Application Detail</h1>
        <Link to="/" className="text-sm text-blue-600 hover:underline">Back to Dashboard</Link>
      </div>

      <ApplicationInfo application={application} />

      {canUpdateStatus && availableTransitions.length > 0 && (
        <Card title="Update Status">
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Current status: <StatusBadge status={application.status} />
            </p>
            <div className="flex gap-2">
              {availableTransitions.map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusUpdate(status)}
                  disabled={updating}
                  className={`px-4 py-2 text-sm font-medium rounded-md text-white disabled:opacity-50 ${
                    status === 'approved'
                      ? 'bg-green-600 hover:bg-green-700'
                      : status === 'rejected'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {updating ? 'Updating...' : status === 'under_review' ? 'Send to Review' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
            {updateError && <p className="text-sm text-red-600">{updateError}</p>}
          </div>
        </Card>
      )}

      {application.bankData && (
        <Card title="Bank Evaluation Data">
          <pre className="text-sm text-gray-600 overflow-auto">{JSON.stringify(application.bankData, null, 2)}</pre>
        </Card>
      )}
    </div>
  );
}
