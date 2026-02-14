import { useState, useEffect } from 'react';
import type { Application } from '../types';
import { getApplication } from '../services/applicationApi';
import { getSocket, connectSocket, subscribeToApplication, unsubscribeFromApplication } from '../services/websocket';

export function useApplication(id: string) {
  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    getApplication(id)
      .then((res) => { setApplication(res.data); setIsLoading(false); })
      .catch((err) => { setError(err.message || 'Failed to fetch'); setIsLoading(false); });
  }, [id]);

  useEffect(() => {
    connectSocket();
    subscribeToApplication(id);
    const socket = getSocket();

    const handleUpdate = (data: Application) => {
      if (data.id === id) setApplication(data);
    };
    const handleRiskEvaluated = (data: { applicationId: string }) => {
      if (data.applicationId === id) {
        getApplication(id).then((res) => setApplication(res.data));
      }
    };

    socket.on('application:updated', handleUpdate);
    socket.on('application:risk-evaluated', handleRiskEvaluated);
    socket.on('application:status-changed', handleRiskEvaluated);

    return () => {
      unsubscribeFromApplication(id);
      socket.off('application:updated', handleUpdate);
      socket.off('application:risk-evaluated', handleRiskEvaluated);
      socket.off('application:status-changed', handleRiskEvaluated);
    };
  }, [id]);

  return { application, isLoading, error, refetch: () => getApplication(id).then((res) => setApplication(res.data)) };
}
