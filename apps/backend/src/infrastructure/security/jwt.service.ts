import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export class JwtService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string = '24h',
    private readonly refreshExpiresIn: string = '7d',
  ) {}

  sign(payload: JwtPayload): string {
    return jwt.sign(payload, this.secret, { expiresIn: this.expiresIn as any });
  }

  signRefresh(payload: JwtPayload): string {
    return jwt.sign(payload, this.secret, { expiresIn: this.refreshExpiresIn as any });
  }

  verify(token: string): JwtPayload {
    return jwt.verify(token, this.secret) as JwtPayload;
  }
}
