export interface IWebSocketEmitter {
  emitToCountry(countryCode: string, event: string, data: unknown): void;
  emitToApplication(applicationId: string, event: string, data: unknown): void;
}
