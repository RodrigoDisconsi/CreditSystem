import { Link } from 'react-router-dom';
import type { Application } from '../../types';
import StatusBadge from './StatusBadge';
import { COUNTRIES } from '../../constants/countries';
import { formatCurrency, formatDate } from '../../lib/formatters';
import Skeleton from '../ui/Skeleton';

interface Props { applications: Application[]; isLoading: boolean }

export default function ApplicationTable({ applications, isLoading }: Props) {
  if (isLoading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  if (!applications.length) return <p className="text-center text-gray-500 py-8">No applications found.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {applications.map((app) => (
            <tr key={app.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <Link to={`/applications/${app.id}`} className="text-blue-600 hover:underline font-medium">{app.fullName}</Link>
              </td>
              <td className="px-4 py-3 text-sm">{COUNTRIES[app.countryCode]?.flag} {app.countryCode}</td>
              <td className="px-4 py-3 text-sm">{formatCurrency(app.requestedAmount, app.countryCode)}</td>
              <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
              <td className="px-4 py-3 text-sm text-gray-500">{formatDate(app.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
