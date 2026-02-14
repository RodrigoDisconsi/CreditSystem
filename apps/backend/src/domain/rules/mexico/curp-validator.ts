/**
 * Validates a Mexican CURP (Clave Unica de Registro de Poblacion).
 *
 * CURP format: 18 characters
 * Pattern: 4 letters + 6 digits + H/M + 5 letters + 1 alphanumeric + 1 digit
 * Regex: /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/
 *
 * Example: GARC850101HDFRRL09
 */
const CURP_REGEX = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/;

export function validateCURP(curp: string): boolean {
  if (!curp || curp.length !== 18) {
    return false;
  }

  return CURP_REGEX.test(curp.toUpperCase());
}
