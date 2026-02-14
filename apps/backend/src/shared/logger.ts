import winston from 'winston';
import { env } from '../config/env.js';
import { getRequestId } from './request-context.js';

const PII_FIELDS = ['documentId', 'document_id'];

function redactPii(info: winston.Logform.TransformableInfo): winston.Logform.TransformableInfo {
  const sanitized = { ...info };

  for (const field of PII_FIELDS) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  if (sanitized.message && typeof sanitized.message === 'object') {
    const msg = { ...(sanitized.message as Record<string, unknown>) };
    for (const field of PII_FIELDS) {
      if (field in msg) {
        msg[field] = '[REDACTED]';
      }
    }
    sanitized.message = msg;
  }

  return sanitized;
}

const piiRedactionFormat = winston.format((info) => redactPii(info));

const requestIdFormat = winston.format((info) => {
  info.requestId = getRequestId();
  return info;
});

const developmentFormat = winston.format.combine(
  winston.format.timestamp(),
  requestIdFormat(),
  piiRedactionFormat(),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${requestId}] ${level}: ${message}${metaStr}`;
  }),
);

const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  requestIdFormat(),
  piiRedactionFormat(),
  winston.format.json(),
);

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  transports: [new winston.transports.Console()],
  exitOnError: false,
});
