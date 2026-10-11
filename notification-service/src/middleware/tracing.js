import { trace, context, propagation } from '@opentelemetry/api';
import crypto from 'crypto';

/**
 * Generates a valid W3C 16-byte (32-character hex) trace ID.
 * @returns {string} 32-char hex string
 */
export function generateTraceId() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generates a valid W3C 8-byte (16-character hex) span ID.
 * @returns {string} 16-char hex string
 */
export function generateSpanId() {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Retrieves the current trace ID from active OpenTelemetry context or active span.
 * Falls back to null if no trace context is active.
 * @returns {string|null}
 */
export function getCurrentTraceId() {
  const activeSpan = trace.getSpan(context.active());
  if (activeSpan) {
    const spanContext = activeSpan.spanContext();
    if (spanContext && spanContext.traceId) {
      return spanContext.traceId;
    }
  }
  return null;
}

/**
 * Extracts W3C Trace Context from an incoming header dictionary.
 * Supports both HTTP headers and RabbitMQ message headers.
 * @param {Record<string, any>} headers
 * @returns {import('@opentelemetry/api').Context}
 */
export function extractTraceContext(headers = {}) {
  const normalizedHeaders = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined && value !== null) {
      normalizedHeaders[key.toLowerCase()] = String(value);
    }
  }

  return propagation.extract(context.active(), normalizedHeaders);
}

/**
 * Injects current active trace context into headers object.
 * @param {Record<string, any>} [headers={}]
 * @returns {Record<string, any>}
 */
export function injectTraceContext(headers = {}) {
  const output = { ...headers };
  propagation.inject(context.active(), output);
  return output;
}

/**
 * Express middleware to extract and propagate W3C traceparent and tracestate headers.
 * Ensures every incoming HTTP request has an associated trace context and outgoing traceparent header.
 */
export function tracingMiddleware(req, res, next) {
  const traceparent = req.headers['traceparent'] || req.headers['Traceparent'];
  const tracestate = req.headers['tracestate'] || req.headers['Tracestate'];

  const carrier = {};
  if (traceparent) {
    carrier['traceparent'] = traceparent;
  }
  if (tracestate) {
    carrier['tracestate'] = tracestate;
  }

  let extractedContext = propagation.extract(context.active(), carrier);
  let traceId;

  if (traceparent && typeof traceparent === 'string') {
    const parts = traceparent.split('-');
    if (parts.length >= 4 && parts[1]) {
      traceId = parts[1];
    }
  }

  if (!traceId) {
    traceId = generateTraceId();
    const spanId = generateSpanId();
    carrier['traceparent'] = `00-${traceId}-${spanId}-01`;
    extractedContext = propagation.extract(context.active(), carrier);
  }

  res.setHeader('traceparent', carrier['traceparent'] || `00-${traceId}-${generateSpanId()}-01`);
  if (tracestate) {
    res.setHeader('tracestate', tracestate);
  }

  req.traceId = traceId;

  context.with(extractedContext, () => {
    next();
  });
}
