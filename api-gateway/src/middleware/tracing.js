import crypto from 'node:crypto';
import { propagation, context, trace, TraceFlags } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';

try {
  propagation.setGlobalPropagator(new W3CTraceContextPropagator());
} catch {
  // Propagator already initialized
}

const TRACEPARENT_REGEX = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;

export const tracingMiddleware = (req, res, next) => {
  let traceparent = req.headers['traceparent'];

  if (!traceparent || !TRACEPARENT_REGEX.test(traceparent)) {
    const traceId = crypto.randomBytes(16).toString('hex');
    const spanId = crypto.randomBytes(8).toString('hex');
    traceparent = `00-${traceId}-${spanId}-01`;
    req.headers['traceparent'] = traceparent;
  }

  const match = traceparent.match(TRACEPARENT_REGEX);
  const traceId = match[1];
  const spanId = match[2];
  const flags = parseInt(match[3], 16);

  req.traceId = traceId;
  res.setHeader('traceparent', traceparent);

  if (req.headers['tracestate']) {
    res.setHeader('tracestate', req.headers['tracestate']);
  }

  let activeContext = propagation.extract(context.active(), req.headers);

  const currentSpan = trace.getSpan(activeContext);
  if (!currentSpan) {
    const spanContext = {
      traceId,
      spanId,
      traceFlags: flags || TraceFlags.SAMPLED,
      isRemote: true
    };
    activeContext = trace.setSpan(activeContext, trace.wrapSpanContext(spanContext));
  }

  context.with(activeContext, () => {
    next();
  });
};
