import { useWebSocket } from '../../hooks/useWebSocket';

export default function RealTimeIndicator() {
  const { isConnected } = useWebSocket();
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="text-gray-500">{isConnected ? 'Real-time' : 'Disconnected'}</span>
    </div>
  );
}
