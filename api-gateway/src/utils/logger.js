import winston from 'winston';
import { trace, context } from '@opentelemetry/api';
import { config } from '../config.js';

const { combine, timestamp, json } = winston.format;

const traceFormat = winston.format((info) => {
  const span = trace.getSpan(context.active());
  const traceId = span?.spanContext()?.traceId || info.traceId || null;
  info.service = config.serviceName;
  info.traceId = traceId;
  return info;
});

export const logger = winston.createLogger({
  level: config.logLevel,
  format: combine(
    timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    traceFormat(),
    json()
  ),
  transports: [
    new winston.transports.Console({
      silent: config.nodeEnv === 'test' && !process.env.DEBUG
    })
  ]
});
