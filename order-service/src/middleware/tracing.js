import crypto from 'node:crypto';
import { propagation, ROOT_CONTEXT } from '@opentelemetry/api';
import { traceStorage } from '../utils/logger.js';

const TRACEPARENT_REGEX = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;

export const tracingMiddleware = (req, res, next) => {
  // Extract OpenTelemetry context from carrier headers
  const extractedContext = propagation.extract(ROOT_CONTEXT, req.headers);

  let traceparent = req.headers['traceparent'];
  let tracestate = req.headers['tracestate'];

  let traceId;
  let spanId;
  let traceFlags = '01';

  if (typeof traceparent === 'string' && TRACEPARENT_REGEX.test(traceparent)) {
    const match = traceparent.match(TRACEPARENT_REGEX);
    traceId = match[1];
    // Generate new span id for current service
    spanId = crypto.randomBytes(8).toString('hex');
    traceFlags = match[3];
  } else {
    traceId = crypto.randomBytes(16).toString('hex');
    spanId = crypto.randomBytes(8).toString('hex');
    traceparent = `00-${traceId}-${spanId}-${traceFlags}`;
  }

  // Construct current outgoing traceparent
  const currentTraceparent = `00-${traceId}-${spanId}-${traceFlags}`;

  // Attach to request and response
  req.traceId = traceId;
  req.spanId = spanId;
  req.traceparent = currentTraceparent;
  req.tracestate = tracestate || '';

  res.setHeader('traceparent', currentTraceparent);
  if (tracestate) {
    res.setHeader('tracestate', tracestate);
  }

  // Run in AsyncLocalStorage context so winston logger captures traceId
  traceStorage.run({ traceId, spanId, extractedContext }, () => {
    next();
  });
};

export default tracingMiddleware;
