import type { Application } from '../../domain/entities/application.entity.js';
import type { IEncryptionService } from '../../domain/interfaces/encryption.interface.js';
import type { ApplicationStatus, CountryCode, BankData } from '@credit-system/shared';

export interface ApplicationResponseDto {
  id: string;
  countryCode: CountryCode;
  fullName: string;
  documentId: string;
  requestedAmount: number;
  monthlyIncome: number;
  status: ApplicationStatus;
  bankData: BankData | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Masks a document ID to show only the last 4 characters.
 * Example: "12345678909" -> "***...8909"
 */
function maskDocumentId(documentId: string): string {
  if (documentId.length <= 4) {
    return documentId;
  }
  const lastFour = documentId.slice(-4);
  return `***...${lastFour}`;
}

/**
 * Converts an Application domain entity into a clean response DTO.
 * Decrypts the documentId using the encryption service, then masks it.
 * Formats dates as ISO strings.
 */
export function toApplicationResponse(
  application: Application,
  encryptionService: IEncryptionService,
): ApplicationResponseDto {
  let maskedDocumentId: string;

  try {
    const decrypted = encryptionService.decrypt(application.documentId);
    maskedDocumentId = maskDocumentId(decrypted);
  } catch {
    // If decryption fails (e.g., already plain text in tests), mask directly
    maskedDocumentId = maskDocumentId(application.documentId);
  }

  return {
    id: application.id,
    countryCode: application.countryCode,
    fullName: application.fullName,
    documentId: maskedDocumentId,
    requestedAmount: application.requestedAmount,
    monthlyIncome: application.monthlyIncome,
    status: application.status,
    bankData: application.bankData,
    createdAt: application.createdAt.toISOString(),
    updatedAt: application.updatedAt.toISOString(),
  };
}
