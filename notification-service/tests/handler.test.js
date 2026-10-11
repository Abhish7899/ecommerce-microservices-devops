import { handleOrderCreated } from '../src/handlers/orderCreatedHandler.js';
import { notificationService } from '../src/services/notificationService.js';
import { logger } from '../src/utils/logger.js';

describe('Order Created Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully handle a valid Buffer payload', async () => {
    const payload = {
      orderId: 'ord-1001',
      userId: 'usr-2001',
      items: [{ id: 'item-1', name: 'Wireless Headphones', price: 99.99, quantity: 1 }],
      total: 99.99,
      status: 'created',
      createdAt: '2026-10-27T12:00:00Z',
    };

    const buffer = Buffer.from(JSON.stringify(payload));
    const result = await handleOrderCreated(buffer);

    expect(result).toBeDefined();
    expect(result.emailResult.success).toBe(true);
    expect(result.emailResult.type).toBe('email');
    expect(result.webhookResult.success).toBe(true);
    expect(result.webhookResult.type).toBe('webhook');
  });

  it('should successfully handle a valid JSON string payload', async () => {
    const jsonString = JSON.stringify({
      orderId: 'ord-1002',
      userId: 'usr-2002',
      total: 49.50,
    });

    const result = await handleOrderCreated(jsonString);

    expect(result.emailResult.success).toBe(true);
    expect(result.webhookResult.success).toBe(true);
  });

  it('should successfully handle payload with snake_case fields', async () => {
    const payload = {
      order_id: 'ord-1003',
      user_id: 'usr-2003',
      total_amount: 150.00,
    };

    const result = await handleOrderCreated(payload);

    expect(result.emailResult.success).toBe(true);
    expect(result.webhookResult.success).toBe(true);
  });

  it('should throw an error when payload is malformed JSON buffer', async () => {
    const badBuffer = Buffer.from('invalid { json');

    await expect(handleOrderCreated(badBuffer)).rejects.toThrow(/Malformed JSON in order.created event/);
  });

  it('should throw an error when payload is missing orderId', async () => {
    const payload = {
      userId: 'usr-2004',
      total: 100,
    };

    await expect(handleOrderCreated(payload)).rejects.toThrow('Event validation failed: missing orderId');
  });

  it('should throw an error when payload is missing userId', async () => {
    const payload = {
      orderId: 'ord-1005',
      total: 100,
    };

    await expect(handleOrderCreated(payload)).rejects.toThrow('Event validation failed: missing userId');
  });

  it('should throw an error when payload is neither buffer, string, nor object', async () => {
    await expect(handleOrderCreated(null)).rejects.toThrow('Invalid payload received: expected Buffer, string, or Object');
  });
});
