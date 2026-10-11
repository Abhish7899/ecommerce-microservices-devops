import winston from 'winston';
import { trace, context } from '@opentelemetry/api';
import { config } from '../config.js';

const otelFormat = winston.format((info) => {
  const currentSpan = trace.getSpan(context.active());
  if (currentSpan) {
    const spanContext = currentSpan.spanContext();
    if (spanContext?.traceId) {
      info.traceId = spanContext.traceId;
      info.spanId = spanContext.spanId;
    }
  }
  if (!info.traceId) {
    info.traceId = null;
  }
  info.service = config.serviceName;
  return info;
});

export const logger = winston.createLogger({
  level: config.logLevel || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    otelFormat(),
    winston.format.json()
  ),
  defaultMeta: {
    service: config.serviceName,
  },
  transports: [
    new winston.transports.Console(),
  ],
});
