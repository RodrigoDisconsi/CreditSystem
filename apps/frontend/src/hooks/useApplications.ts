import { useEffect } from 'react';
import { useApplicationStore } from '../stores/applicationStore';
import { getSocket, connectSocket } from '../services/websocket';
import type { Application } from '../types';

export function useApplications() {
  const store = useApplicationStore();

  useEffect(() => {
    store.fetchApplications();
  }, [store.page, store.filters.country, store.filters.status]);

  useEffect(() => {
    connectSocket();
    const socket = getSocket();

    const handleCreated = (data: Application) => store.addApplication(data);
    const handleUpdated = (data: Application) => store.updateApplication(data);
    const handleStatusChanged = (data: { applicationId: string; newStatus: string }) => {
      store.fetchApplications(); // Refresh list on status change
    };

    socket.on('application:created', handleCreated);
    socket.on('application:updated', handleUpdated);
    socket.on('application:status-changed', handleStatusChanged);

    return () => {
      socket.off('application:created', handleCreated);
      socket.off('application:updated', handleUpdated);
      socket.off('application:status-changed', handleStatusChanged);
    };
  }, []);

  return store;
}
