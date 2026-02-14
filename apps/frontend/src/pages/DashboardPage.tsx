import { Link } from 'react-router-dom';
import { useApplications } from '../hooks/useApplications';
import ApplicationTable from '../components/application/ApplicationTable';
import ApplicationTableFilters from '../components/application/ApplicationTableFilters';
import RealTimeIndicator from '../components/application/RealTimeIndicator';
import Pagination from '../components/ui/Pagination';
import Button from '../components/ui/Button';

export default function DashboardPage() {
  const { applications, isLoading, page, totalPages, filters, setFilter, setPage } = useApplications();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <RealTimeIndicator />
        </div>
        <Link to="/applications/new"><Button>New Application</Button></Link>
      </div>
      <ApplicationTableFilters
        country={filters.country}
        status={filters.status}
        onCountryChange={(v) => setFilter('country', v)}
        onStatusChange={(v) => setFilter('status', v)}
      />
      <ApplicationTable applications={applications} isLoading={isLoading} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
