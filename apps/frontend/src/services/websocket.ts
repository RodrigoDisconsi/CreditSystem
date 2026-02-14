import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/', {
      autoConnect: false,
      auth: { token: useAuthStore.getState().token },
    });
  }
  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  s.auth = { token: useAuthStore.getState().token };
  if (!s.connected) s.connect();
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function subscribeToCountry(country: string): void {
  getSocket().emit('subscribe:country', country);
}

export function unsubscribeFromCountry(country: string): void {
  getSocket().emit('unsubscribe:country', country);
}

export function subscribeToApplication(id: string): void {
  getSocket().emit('subscribe:application', id);
}

export function unsubscribeFromApplication(id: string): void {
  getSocket().emit('unsubscribe:application', id);
}
