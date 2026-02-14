/**
 * Validates a Brazilian CPF (Cadastro de Pessoas Fisicas) number.
 *
 * CPF format: 11 numeric digits (dots and dash are stripped).
 * Example valid format: 123.456.789-09 or 12345678909
 *
 * Validation:
 * 1. Must have exactly 11 digits after stripping non-numeric characters.
 * 2. All-same-digit CPFs are rejected (e.g., 111.111.111-11).
 * 3. Two verification digits are calculated and must match.
 */
export function validateCPF(cpf: string): boolean {
  // Strip non-numeric characters
  const cleaned = cpf.replace(/\D/g, '');

  // Must be exactly 11 digits
  if (cleaned.length !== 11) {
    return false;
  }

  // Reject all-same-digit CPFs
  if (/^(\d)\1{10}$/.test(cleaned)) {
    return false;
  }

  // Calculate first verification digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i), 10) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) {
    remainder = 0;
  }
  if (remainder !== parseInt(cleaned.charAt(9), 10)) {
    return false;
  }

  // Calculate second verification digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i), 10) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) {
    remainder = 0;
  }
  if (remainder !== parseInt(cleaned.charAt(10), 10)) {
    return false;
  }

  return true;
}
