import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

interface InternalPayload extends JwtPayload {
  type: 'access' | 'refresh';
}

export class JwtService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string = '24h',
    private readonly refreshExpiresIn: string = '7d',
  ) {}

  sign(payload: JwtPayload): string {
    const internal: InternalPayload = { ...payload, type: 'access' };
    return jwt.sign(internal, this.secret, { expiresIn: this.expiresIn } as any);
  }

  signRefresh(payload: JwtPayload): string {
    const internal: InternalPayload = { ...payload, type: 'refresh' };
    return jwt.sign(internal, this.secret, { expiresIn: this.refreshExpiresIn } as any);
  }

  verify(token: string): JwtPayload {
    const decoded = jwt.verify(token, this.secret) as InternalPayload;
    if (decoded.type && decoded.type !== 'access') {
      throw new Error('Invalid token type: expected access token');
    }
    return { userId: decoded.userId, email: decoded.email, role: decoded.role };
  }

  verifyRefresh(token: string): JwtPayload {
    const decoded = jwt.verify(token, this.secret) as InternalPayload;
    if (decoded.type && decoded.type !== 'refresh') {
      throw new Error('Invalid token type: expected refresh token');
    }
    return { userId: decoded.userId, email: decoded.email, role: decoded.role };
  }
}
