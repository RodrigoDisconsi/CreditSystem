import Select from '../ui/Select';
import type { ApplicationStatus, CountryCode } from '../../types';

interface Props {
  country?: CountryCode;
  status?: ApplicationStatus;
  onCountryChange: (v: string | undefined) => void;
  onStatusChange: (v: string | undefined) => void;
}

export default function ApplicationTableFilters({ country, status, onCountryChange, onStatusChange }: Props) {
  return (
    <div className="flex gap-4">
      <Select
        label="Country"
        value={country || ''}
        onChange={(e) => onCountryChange(e.target.value || undefined)}
        placeholder="All countries"
        options={[{ label: 'Brazil', value: 'BR' }, { label: 'Mexico', value: 'MX' }]}
      />
      <Select
        label="Status"
        value={status || ''}
        onChange={(e) => onStatusChange(e.target.value || undefined)}
        placeholder="All statuses"
        options={[
          { label: 'Pending', value: 'pending' },
          { label: 'Under Review', value: 'under_review' },
          { label: 'Approved', value: 'approved' },
          { label: 'Rejected', value: 'rejected' },
        ]}
      />
    </div>
  );
}
