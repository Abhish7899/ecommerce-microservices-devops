import winston from 'winston';
import { config } from '../config.js';
import { getCurrentTraceId } from '../middleware/tracing.js';

const addContextFormat = winston.format((info) => {
  info.service = config.serviceName;
  const currentTrace = getCurrentTraceId();
  if (currentTrace) {
    info.traceId = currentTrace;
  } else if (info.traceId === undefined) {
    info.traceId = null;
  }
  return info;
});

export const logger = winston.createLogger({
  level: config.logLevel || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    addContextFormat(),
    winston.format.json()
  ),
  defaultMeta: {
    service: config.serviceName,
  },
  transports: [
    new winston.transports.Console(),
  ],
});
