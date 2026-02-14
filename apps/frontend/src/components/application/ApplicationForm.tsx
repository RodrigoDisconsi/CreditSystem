import { useState } from 'react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import type { CountryCode, CreateApplicationDTO } from '../../types';
import { validateCPF } from '../../lib/validators/cpf';
import { validateCURP } from '../../lib/validators/curp';

interface Props { onSubmit: (data: CreateApplicationDTO) => Promise<void>; isLoading: boolean }

export default function ApplicationForm({ onSubmit, isLoading }: Props) {
  const [country, setCountry] = useState<CountryCode>('BR');
  const [fullName, setFullName] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [requestedAmount, setRequestedAmount] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (fullName.length < 2) errs.fullName = 'Name must be at least 2 characters';
    if (country === 'BR' && !validateCPF(documentId)) errs.documentId = 'Invalid CPF';
    if (country === 'MX' && !validateCURP(documentId.toUpperCase())) errs.documentId = 'Invalid CURP';
    if (!requestedAmount || parseFloat(requestedAmount) <= 0) errs.requestedAmount = 'Must be positive';
    if (!monthlyIncome || parseFloat(monthlyIncome) <= 0) errs.monthlyIncome = 'Must be positive';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({
      countryCode: country,
      fullName,
      documentId: country === 'MX' ? documentId.toUpperCase() : documentId.replace(/\D/g, ''),
      requestedAmount: parseFloat(requestedAmount),
      monthlyIncome: parseFloat(monthlyIncome),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <Select label="Country" value={country} onChange={(e) => { setCountry(e.target.value as CountryCode); setDocumentId(''); setErrors({}); }}
        options={[{ label: 'Brazil', value: 'BR' }, { label: 'Mexico', value: 'MX' }]} />
      <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} error={errors.fullName} />
      <Input label={country === 'BR' ? 'CPF' : 'CURP'} value={documentId} onChange={(e) => setDocumentId(e.target.value)}
        error={errors.documentId} placeholder={country === 'BR' ? '000.000.000-00' : 'AAAA000000AAAAAA00'} />
      <Input label="Requested Amount" type="number" value={requestedAmount} onChange={(e) => setRequestedAmount(e.target.value)}
        error={errors.requestedAmount} />
      <Input label="Monthly Income" type="number" value={monthlyIncome} onChange={(e) => setMonthlyIncome(e.target.value)}
        error={errors.monthlyIncome} />
      <Button type="submit" isLoading={isLoading}>Submit Application</Button>
    </form>
  );
}
