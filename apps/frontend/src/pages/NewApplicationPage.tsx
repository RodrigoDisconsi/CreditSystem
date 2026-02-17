import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ApplicationForm from '../components/application/ApplicationForm';
import Card from '../components/ui/Card';
import { createApplication } from '../services/applicationApi';
import type { CreateApplicationDTO } from '../types';

export default function NewApplicationPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: CreateApplicationDTO) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await createApplication(data);
      navigate(`/applications/${res.data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create application');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Application</h1>
      <Card>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
        <ApplicationForm onSubmit={handleSubmit} isLoading={isLoading} />
      </Card>
    </div>
  );
}
