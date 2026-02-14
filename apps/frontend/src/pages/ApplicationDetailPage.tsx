import { useParams } from 'react-router-dom';
import { useApplication } from '../hooks/useApplication';
import ApplicationInfo from '../components/application/ApplicationInfo';
import Card from '../components/ui/Card';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { application, isLoading, error } = useApplication(id!);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!application) return <div className="text-gray-500">Application not found</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Application Detail</h1>
      <ApplicationInfo application={application} />
      {application.bankData && (
        <Card title="Bank Evaluation Data">
          <pre className="text-sm text-gray-600 overflow-auto">{JSON.stringify(application.bankData, null, 2)}</pre>
        </Card>
      )}
    </div>
  );
}
