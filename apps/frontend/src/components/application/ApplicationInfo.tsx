import type { Application } from '../../types';
import Card from '../ui/Card';
import StatusBadge from './StatusBadge';
import { COUNTRIES } from '../../constants/countries';
import { formatCurrency, formatDateTime, maskDocument } from '../../lib/formatters';

export default function ApplicationInfo({ application }: { application: Application }) {
  const country = COUNTRIES[application.countryCode];
  return (
    <Card title="Application Details">
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div><dt className="text-gray-500">Name</dt><dd className="font-medium">{application.fullName}</dd></div>
        <div><dt className="text-gray-500">Country</dt><dd>{country.flag} {country.name}</dd></div>
        <div><dt className="text-gray-500">Document</dt><dd>{maskDocument(application.documentId)}</dd></div>
        <div><dt className="text-gray-500">Status</dt><dd><StatusBadge status={application.status} /></dd></div>
        <div><dt className="text-gray-500">Requested Amount</dt><dd>{formatCurrency(application.requestedAmount, application.countryCode)}</dd></div>
        <div><dt className="text-gray-500">Monthly Income</dt><dd>{formatCurrency(application.monthlyIncome, application.countryCode)}</dd></div>
        <div><dt className="text-gray-500">Created</dt><dd>{formatDateTime(application.createdAt)}</dd></div>
        <div><dt className="text-gray-500">Updated</dt><dd>{formatDateTime(application.updatedAt)}</dd></div>
      </dl>
    </Card>
  );
}
