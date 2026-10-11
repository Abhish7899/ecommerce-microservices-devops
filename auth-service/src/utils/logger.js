import winston from 'winston';
import { trace, context } from '@opentelemetry/api';
import config from '../config.js';

const otelTraceFormat = winston.format((info) => {
  if (!info.traceId) {
    const activeSpan = trace.getSpan(context.active());
    if (activeSpan) {
      const spanContext = activeSpan.spanContext();
      if (spanContext && spanContext.traceId) {
        info.traceId = spanContext.traceId;
      }
    }
  }
  if (!info.traceId) {
    info.traceId = null;
  }
  info.service = config.serviceName;
  return info;
});

export const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    otelTraceFormat(),
    winston.format.json()
  ),
  defaultMeta: { service: config.serviceName },
  transports: [
    new winston.transports.Console()
  ]
});

export default logger;
