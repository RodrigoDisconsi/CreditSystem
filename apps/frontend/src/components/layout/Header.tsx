import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export default function Header() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-xl font-bold text-gray-900">Credit System</Link>
          <nav className="flex gap-4">
            <Link to="/" className="text-sm text-gray-600 hover:text-gray-900">Dashboard</Link>
            <Link to="/applications/new" className="text-sm text-gray-600 hover:text-gray-900">New Application</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.email}</span>
          <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-800">Logout</button>
        </div>
      </div>
    </header>
  );
}
