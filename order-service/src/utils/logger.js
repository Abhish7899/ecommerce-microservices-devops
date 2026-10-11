import winston from 'winston';
import { trace, context } from '@opentelemetry/api';
import { AsyncLocalStorage } from 'node:async_hooks';
import config from '../config.js';

export const traceStorage = new AsyncLocalStorage();

const getTraceId = () => {
  try {
    const activeSpan = trace.getSpan(context.active());
    if (activeSpan) {
      const spanContext = activeSpan.spanContext();
      if (spanContext && spanContext.traceId) {
        return spanContext.traceId;
      }
    }
  } catch {
    // Silently fall through to AsyncLocalStorage check
  }

  const store = traceStorage.getStore();
  if (store && store.traceId) {
    return store.traceId;
  }

  return null;
};

const traceFormat = winston.format((info) => {
  info.service = config.SERVICE_NAME;
  const currentTraceId = getTraceId();
  if (currentTraceId) {
    info.traceId = currentTraceId;
  } else if (!info.traceId) {
    info.traceId = null;
  }
  return info;
});

export const logger = winston.createLogger({
  level: config.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    traceFormat(),
    winston.format.json()
  ),
  defaultMeta: { service: config.SERVICE_NAME },
  transports: [
    new winston.transports.Console()
  ]
});

export default logger;
