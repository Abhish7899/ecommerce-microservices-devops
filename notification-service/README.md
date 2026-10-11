# Notification Service

A resilient Node.js background consumer worker for processing e-commerce order events with OpenTelemetry distributed tracing, Winston structured JSON logging, exponential retry tracking, dead-letter queue (DLQ) routing, and an HTTP health check endpoint.

## Architecture

- **Runtime**: Node.js 20 (ES Modules)
- **Message Broker**: RabbitMQ via `amqplib`
- **Exchange**: `ecommerce.events` (topic exchange)
- **Queue**: `notification.order.created` (bound to routing key `order.created`)
- **Dead-Letter Exchange (DLX)**: `ecommerce.dlx` (topic exchange)
- **Dead-Letter Queue (DLQ)**: `notification.order.created.dlq` (bound to DLX)
- **Retries**: Up to 3 attempts tracked via header `x-retry-count`
- **Tracing**: W3C Trace Context (`traceparent`, `tracestate`) via `@opentelemetry/api`
- **Logging**: Winston with structured JSON output, timestamp, service name, and active trace ID
- **Health Check**: Express HTTP server on port 3004 at `GET /healthz`

## File Structure

```text
notification-service/
├── .dockerignore
├── Dockerfile
├── package.json
├── README.md
├── src/
│   ├── config.js                      # Environment and RabbitMQ configuration
│   ├── consumer.js                    # RabbitMQ consumer with retry & DLQ logic
│   ├── index.js                       # Main entry: starts health server & consumer
│   ├── handlers/
│   │   └── orderCreatedHandler.js     # Validates order.created events & coordinates notifications
│   ├── middleware/
│   │   └── tracing.js                 # W3C trace context extraction, propagation & Express middleware
│   ├── services/
│   │   └── notificationService.js     # Simulated email and webhook sending
│   └── utils/
│       └── logger.js                  # Winston structured JSON logger with traceId context
└── tests/
    ├── consumer.test.js               # Tests topology setup, message ack, retry, DLQ, healthz
    └── handler.test.js                # Tests payload parsing, validation, email & webhook simulation
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3004` | Health check HTTP server port |
| `RABBITMQ_URL` | `amqp://guest:guest@rabbitmq:5672` | RabbitMQ connection string |
| `LOG_LEVEL` | `info` | Winston logging level |
| `NODE_ENV` | `production` | Node environment |
| `MAX_RETRIES` | `3` | Maximum processing attempts before DLQ routing |
| `PREFETCH_COUNT` | `10` | RabbitMQ consumer prefetch limit |
| `RECONNECT_INTERVAL_MS`| `5000` | Reconnection interval upon connection loss |

## Health Check Endpoint

```http
GET /healthz
```

**Response (RabbitMQ Connected):**
```json
{
  "status": "ok",
  "service": "notification-service",
  "rabbitmq": "connected",
  "timestamp": "2026-10-27T07:15:00.000Z"
}
```

## Running Tests

```bash
npm test
```
