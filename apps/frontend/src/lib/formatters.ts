import type { CountryCode } from '../types';

export function formatCurrency(amount: number, country: CountryCode): string {
  const locale = country === 'BR' ? 'pt-BR' : 'es-MX';
  const currency = country === 'BR' ? 'BRL' : 'MXN';
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function maskDocument(doc: string): string {
  // Backend already sends masked documents (***...XXXX format)
  // This is a fallback in case unmasked docs are displayed
  if (doc.startsWith('***')) return doc;
  if (doc.length <= 4) return doc;
  return `***...${doc.slice(-4)}`;
}
