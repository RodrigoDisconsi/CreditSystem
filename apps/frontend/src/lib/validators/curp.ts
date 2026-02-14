export function validateCURP(curp: string): boolean {
  if (curp.length !== 18) return false;
  return /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(curp);
}
