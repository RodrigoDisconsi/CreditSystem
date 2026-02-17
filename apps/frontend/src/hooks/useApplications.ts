import { useEffect } from 'react';
import { useApplicationStore } from '../stores/applicationStore';
import { getSocket, connectSocket, subscribeToCountry, unsubscribeFromCountry } from '../services/websocket';
import type { Application } from '../types';

export function useApplications() {
  const store = useApplicationStore();

  useEffect(() => {
    store.fetchApplications();
  }, [store.page, store.filters.country, store.filters.status]);

  useEffect(() => {
    connectSocket();
    const socket = getSocket();

    // Subscribe to country rooms so we receive events
    const onConnect = () => {
      subscribeToCountry('BR');
      subscribeToCountry('MX');
    };

    // Subscribe immediately if already connected, otherwise on connect
    if (socket.connected) {
      onConnect();
    }
    socket.on('connect', onConnect);

    const handleCreated = (data: Application) => store.addApplication(data);
    const handleUpdated = (data: Application) => store.updateApplication(data);
    const handleStatusChanged = (data: { applicationId: string; newStatus: string }) => {
      store.fetchApplications(); // Refresh list on status change
    };
    const handleRiskEvaluated = (data: { applicationId: string }) => {
      store.fetchApplications(); // Refresh list when risk evaluation completes
    };

    socket.on('application:created', handleCreated);
    socket.on('application:updated', handleUpdated);
    socket.on('application:status-changed', handleStatusChanged);
    socket.on('application:risk-evaluated', handleRiskEvaluated);

    return () => {
      socket.off('connect', onConnect);
      socket.off('application:created', handleCreated);
      socket.off('application:updated', handleUpdated);
      socket.off('application:status-changed', handleStatusChanged);
      socket.off('application:risk-evaluated', handleRiskEvaluated);
      unsubscribeFromCountry('BR');
      unsubscribeFromCountry('MX');
    };
  }, []);

  return store;
}
