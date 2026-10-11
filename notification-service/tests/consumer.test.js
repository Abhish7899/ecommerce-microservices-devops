import request from 'supertest';
import { RabbitMQConsumer } from '../src/consumer.js';
import { app } from '../src/index.js';

describe('RabbitMQ Consumer and Health Check', () => {
  let mockChannel;
  let mockConnection;
  let mockAmqp;
  let testConsumer;

  beforeEach(() => {
    mockChannel = {
      assertExchange: jest.fn().mockResolvedValue({}),
      assertQueue: jest.fn().mockResolvedValue({ queue: 'notification.order.created' }),
      bindQueue: jest.fn().mockResolvedValue({}),
      prefetch: jest.fn().mockResolvedValue({}),
      consume: jest.fn().mockResolvedValue({ consumerTag: 'test-consumer-tag' }),
      publish: jest.fn().mockReturnValue(true),
      ack: jest.fn(),
      cancel: jest.fn().mockResolvedValue({}),
      close: jest.fn().mockResolvedValue({}),
      on: jest.fn(),
    };

    mockConnection = {
      createChannel: jest.fn().mockResolvedValue(mockChannel),
      close: jest.fn().mockResolvedValue({}),
      on: jest.fn(),
    };

    mockAmqp = {
      connect: jest.fn().mockResolvedValue(mockConnection),
    };

    testConsumer = new RabbitMQConsumer({
      url: 'amqp://localhost:5672',
      exchange: 'ecommerce.events',
      queue: 'notification.order.created',
      routingKey: 'order.created',
      dlx: 'ecommerce.dlx',
      dlq: 'notification.order.created.dlq',
      maxRetries: 3,
      prefetch: 10,
    });
  });

  describe('Connection & Topology Setup', () => {
    it('should connect to RabbitMQ and establish full topology (DLX, DLQ, Main Exchange, Queue)', async () => {
      await testConsumer.connect(mockAmqp);

      expect(mockAmqp.connect).toHaveBeenCalledWith('amqp://localhost:5672');
      expect(mockConnection.createChannel).toHaveBeenCalled();

      // Assert Dead Letter Exchange and Queue
      expect(mockChannel.assertExchange).toHaveBeenCalledWith('ecommerce.dlx', 'topic', { durable: true });
      expect(mockChannel.assertQueue).toHaveBeenCalledWith('notification.order.created.dlq', { durable: true });
      expect(mockChannel.bindQueue).toHaveBeenCalledWith('notification.order.created.dlq', 'ecommerce.dlx', '#');

      // Assert Main Exchange and Queue
      expect(mockChannel.assertExchange).toHaveBeenCalledWith('ecommerce.events', 'topic', { durable: true });
      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        'notification.order.created',
        expect.objectContaining({
          durable: true,
          arguments: {
            'x-dead-letter-exchange': 'ecommerce.dlx',
            'x-dead-letter-routing-key': 'order.created',
          },
        })
      );
      expect(mockChannel.bindQueue).toHaveBeenCalledWith('notification.order.created', 'ecommerce.events', 'order.created');
      expect(mockChannel.prefetch).toHaveBeenCalledWith(10);
      expect(testConsumer.isConnected()).toBe(true);
    });

    it('should register a consumer on the queue', async () => {
      await testConsumer.connect(mockAmqp);
      await testConsumer.startConsuming();

      expect(mockChannel.consume).toHaveBeenCalledWith(
        'notification.order.created',
        expect.any(Function),
        { noAck: false }
      );
    });
  });

  describe('Message Processing and Acknowledgment', () => {
    beforeEach(async () => {
      await testConsumer.connect(mockAmqp);
    });

    it('should acknowledge message upon successful processing', async () => {
      const msg = {
        fields: { routingKey: 'order.created' },
        properties: {
          headers: {
            traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
          },
        },
        content: Buffer.from(JSON.stringify({
          orderId: 'ord-555',
          userId: 'user-777',
          total: 120,
        })),
      };

      await testConsumer.processMessage(msg);

      expect(mockChannel.ack).toHaveBeenCalledWith(msg);
      expect(mockChannel.publish).not.toHaveBeenCalled();
    });

    it('should republish with incremented retry count when processing fails and retries < 3', async () => {
      const invalidMsg = {
        fields: { routingKey: 'order.created' },
        properties: {
          headers: {
            'x-retry-count': 1,
          },
        },
        content: Buffer.from(JSON.stringify({
          // Missing userId - will trigger validation error in handler
          orderId: 'ord-missing-user',
        })),
      };

      await testConsumer.processMessage(invalidMsg);

      // Should acknowledge the original message
      expect(mockChannel.ack).toHaveBeenCalledWith(invalidMsg);

      // Should republish to main exchange with incremented retry count
      expect(mockChannel.publish).toHaveBeenCalledWith(
        'ecommerce.events',
        'order.created',
        invalidMsg.content,
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-retry-count': 2,
            'x-last-error': 'Event validation failed: missing userId',
          }),
        })
      );
    });

    it('should route message to DLQ (ecommerce.dlx) after 3 failed retries', async () => {
      const failedMsg = {
        fields: { routingKey: 'order.created' },
        properties: {
          headers: {
            'x-retry-count': 3,
          },
        },
        content: Buffer.from(JSON.stringify({
          orderId: 'ord-failure-test',
          // Missing userId to force failure
        })),
      };

      await testConsumer.processMessage(failedMsg);

      // Original message is acknowledged
      expect(mockChannel.ack).toHaveBeenCalledWith(failedMsg);

      // Message is routed to Dead Letter Exchange
      expect(mockChannel.publish).toHaveBeenCalledWith(
        'ecommerce.dlx',
        'order.created',
        failedMsg.content,
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-retry-count': 3,
            'x-death-reason': 'Event validation failed: missing userId',
          }),
        })
      );
    });
  });

  describe('Graceful Shutdown', () => {
    it('should cancel consumer and close channel and connection', async () => {
      await testConsumer.connect(mockAmqp);
      await testConsumer.startConsuming();

      await testConsumer.close();

      expect(mockChannel.cancel).toHaveBeenCalledWith('test-consumer-tag');
      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
      expect(testConsumer.isConnected()).toBe(false);
    });
  });

  describe('GET /healthz Endpoint', () => {
    it('should return health status with rabbitmq state and traceparent header', async () => {
      const response = await request(app).get('/healthz');

      expect([200, 503]).toContain(response.status);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('service', 'notification-service');
      expect(response.body).toHaveProperty('rabbitmq');
      expect(response.headers['traceparent']).toBeDefined();
    });
  });
});
