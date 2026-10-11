import crypto from 'crypto';
import { context, trace, TraceFlags } from '@opentelemetry/api';

/**
 * Validates and extracts W3C traceparent header components.
 * Format: 00-${traceId}-${spanId}-${traceFlags}
 * version: 2 hex characters (currently '00')
 * traceId: 32 hex characters
 * spanId: 16 hex characters
 * traceFlags: 2 hex characters (e.g., '01' for sampled)
 */
function parseTraceparent(header) {
  if (!header || typeof header !== 'string') return null;
  const parts = header.trim().split('-');
  if (parts.length !== 4) return null;
  const [version, traceId, parentSpanId, traceFlags] = parts;
  if (version !== '00') return null;
  if (!/^[0-9a-f]{32}$/.test(traceId) || traceId === '00000000000000000000000000000000') return null;
  if (!/^[0-9a-f]{16}$/.test(parentSpanId) || parentSpanId === '0000000000000000') return null;
  if (!/^[0-9a-f]{2}$/.test(traceFlags)) return null;
  return { version, traceId, parentSpanId, traceFlags };
}

/**
 * Tracing middleware that extracts W3C traceparent and tracestate headers,
 * sets up the active OpenTelemetry context, and propagates traceparent/tracestate
 * headers on the response.
 */
export function tracingMiddleware(req, res, next) {
  const incomingTraceparent = req.headers['traceparent'];
  const incomingTracestate = req.headers['tracestate'];

  let parsed = parseTraceparent(incomingTraceparent);
  let traceId;
  let traceFlags = '01';

  if (parsed) {
    traceId = parsed.traceId;
    traceFlags = parsed.traceFlags;
  } else {
    // Generate new 32-hex character traceId
    traceId = crypto.randomBytes(16).toString('hex');
  }

  // Generate new 16-hex character spanId for this request
  const spanId = crypto.randomBytes(8).toString('hex');
  const traceparent = `00-${traceId}-${spanId}-${traceFlags}`;

  // Attach to req object for convenient access
  req.traceId = traceId;
  req.spanId = spanId;

  // Propagate W3C headers on the response
  res.setHeader('traceparent', traceparent);
  if (incomingTracestate) {
    res.setHeader('tracestate', incomingTracestate);
  }

  // Create OpenTelemetry span context and activate it for downstream execution
  const spanContext = {
    traceId,
    spanId,
    traceFlags: traceFlags === '01' ? TraceFlags.SAMPLED : TraceFlags.NONE,
    isRemote: Boolean(parsed)
  };

  const span = trace.wrapSpanContext(spanContext);
  const activeCtx = trace.setSpan(context.active(), span);

  context.with(activeCtx, () => {
    next();
  });
}

export default tracingMiddleware;
