import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-300">404</h1>
        <p className="mt-4 text-gray-600">Page not found</p>
        <Link to="/" className="mt-4 inline-block text-blue-600 hover:underline">Go home</Link>
      </div>
    </div>
  );
}
