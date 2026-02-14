export interface INotificationProvider {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
  sendSMS(to: string, message: string): Promise<void>;
}

export class MockNotificationProvider implements INotificationProvider {
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    console.log(`[MOCK EMAIL] To: ${to}, Subject: ${subject}, Body: ${body}`);
  }

  async sendSMS(to: string, message: string): Promise<void> {
    console.log(`[MOCK SMS] To: ${to}, Message: ${message}`);
  }
}
