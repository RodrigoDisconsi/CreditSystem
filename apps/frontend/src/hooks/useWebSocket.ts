import { useState, useEffect } from 'react';
import { getSocket, connectSocket, disconnectSocket } from '../services/websocket';
import { useAuthStore } from '../stores/authStore';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) return;
    connectSocket();
    const socket = getSocket();

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    setIsConnected(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [isAuthenticated]);

  return { isConnected };
}
