import { v4 as uuidv4 } from 'uuid';

export const requestIdMiddleware = (req, res, next) => {
  const incomingId = req.headers['x-request-id'];
  const requestId = incomingId && typeof incomingId === 'string' && incomingId.trim().length > 0
    ? incomingId.trim()
    : uuidv4();

  req.id = requestId;
  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);

  next();
};
