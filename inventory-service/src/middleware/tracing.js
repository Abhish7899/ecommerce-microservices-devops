import { propagation, context, trace, SpanKind } from '@opentelemetry/api';
import crypto from 'crypto';

/**
 * Generates a valid 32-hex traceId
 */
function generateTraceId() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generates a valid 16-hex spanId
 */
function generateSpanId() {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Middleware to extract and propagate W3C trace context headers (traceparent, tracestate).
 * Runs the request lifecycle within the extracted OpenTelemetry context.
 */
export function tracingMiddleware(req, res, next) {
  // Extract context from incoming W3C headers (traceparent, tracestate)
  let activeContext = propagation.extract(context.active(), req.headers);

  let currentSpan = trace.getSpan(activeContext);
  let spanContext = currentSpan?.spanContext();

  // If no parent trace context exists in headers, create a new trace context
  if (!spanContext || !spanContext.traceId) {
    const traceId = generateTraceId();
    const spanId = generateSpanId();
    const traceFlags = 1; // Sampled

    const newSpanContext = {
      traceId,
      spanId,
      traceFlags,
      isRemote: false,
    };

    activeContext = trace.setSpan(
      activeContext,
      trace.wrapSpanContext(newSpanContext)
    );
    spanContext = newSpanContext;
  }

  // Set traceId on request object for convenient access
  req.traceId = spanContext.traceId;
  req.spanId = spanContext.spanId;

  // Propagate trace context to response headers
  res.setHeader('traceparent', `00-${spanContext.traceId}-${spanContext.spanId}-01`);
  if (req.headers.tracestate) {
    res.setHeader('tracestate', req.headers.tracestate);
  }

  // Execute remaining middleware and handlers within this OpenTelemetry context
  context.with(activeContext, () => {
    next();
  });
}
