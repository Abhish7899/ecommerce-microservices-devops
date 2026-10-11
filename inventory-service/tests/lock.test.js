import { jest } from '@jest/globals';
import { LockService, LockAcquisitionError } from '../src/services/lockService.js';

describe('LockService (Redis Distributed Locking)', () => {
  let mockRedis;
  let lockService;

  beforeEach(() => {
    mockRedis = {
      set: jest.fn(),
      eval: jest.fn(),
    };

    lockService = new LockService(mockRedis, {
      keyPrefix: 'lock:inventory:',
      ttlSeconds: 10,
      maxRetries: 3,
      retryDelayMs: 10, // Short delay for testing
    });
  });

  describe('acquireLock', () => {
    it('should successfully acquire lock on the first attempt', async () => {
      mockRedis.set.mockResolvedValue('OK');

      const token = await lockService.acquireLock(101);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(mockRedis.set).toHaveBeenCalledTimes(1);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'lock:inventory:101',
        token,
        'EX',
        10,
        'NX'
      );
    });

    it('should retry acquiring lock and succeed if available before max retries', async () => {
      // First attempt returns null (locked), second attempt returns OK
      mockRedis.set
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('OK');

      const token = await lockService.acquireLock(101);

      expect(token).toBeDefined();
      expect(mockRedis.set).toHaveBeenCalledTimes(2);
    });

    it('should throw LockAcquisitionError if lock cannot be acquired after max retries', async () => {
      mockRedis.set.mockResolvedValue(null);

      await expect(lockService.acquireLock(101)).rejects.toThrow(LockAcquisitionError);
      expect(mockRedis.set).toHaveBeenCalledTimes(3);
    });
  });

  describe('releaseLock', () => {
    it('should return true when Lua script returns 1 (lock released)', async () => {
      mockRedis.eval.mockResolvedValue(1);

      const result = await lockService.releaseLock(101, 'test-token-123');

      expect(result).toBe(true);
      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.stringContaining('redis.call("get", KEYS[1])'),
        1,
        'lock:inventory:101',
        'test-token-123'
      );
    });

    it('should return false when Lua script returns 0 (token mismatch or expired)', async () => {
      mockRedis.eval.mockResolvedValue(0);

      const result = await lockService.releaseLock(101, 'wrong-token');

      expect(result).toBe(false);
    });

    it('should return false if token is null or undefined', async () => {
      const result = await lockService.releaseLock(101, null);
      expect(result).toBe(false);
      expect(mockRedis.eval).not.toHaveBeenCalled();
    });
  });

  describe('withLock', () => {
    it('should acquire lock, execute function, and release lock in finally', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.eval.mockResolvedValue(1);

      const fn = jest.fn().mockResolvedValue('result-data');

      const result = await lockService.withLock(101, fn);

      expect(result).toBe('result-data');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(mockRedis.set).toHaveBeenCalledTimes(1);
      expect(mockRedis.eval).toHaveBeenCalledTimes(1);
    });

    it('should release lock in finally block even if function throws', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.eval.mockResolvedValue(1);

      const fn = jest.fn().mockRejectedValue(new Error('Internal processing error'));

      await expect(lockService.withLock(101, fn)).rejects.toThrow('Internal processing error');

      expect(mockRedis.set).toHaveBeenCalledTimes(1);
      expect(mockRedis.eval).toHaveBeenCalledTimes(1);
    });
  });

  describe('withMultipleLocks', () => {
    it('should acquire locks in sorted order and release them in reverse order', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.eval.mockResolvedValue(1);

      const fn = jest.fn().mockResolvedValue('multi-done');

      // Pass IDs in unsorted order with duplicates: [50, 10, 50, 20] -> [10, 20, 50]
      const result = await lockService.withMultipleLocks([50, 10, 50, 20], fn);

      expect(result).toBe('multi-done');
      expect(mockRedis.set).toHaveBeenCalledTimes(3);

      const firstCallKey = mockRedis.set.mock.calls[0][0];
      const secondCallKey = mockRedis.set.mock.calls[1][0];
      const thirdCallKey = mockRedis.set.mock.calls[2][0];

      expect(firstCallKey).toBe('lock:inventory:10');
      expect(secondCallKey).toBe('lock:inventory:20');
      expect(thirdCallKey).toBe('lock:inventory:50');

      // All 3 locks released
      expect(mockRedis.eval).toHaveBeenCalledTimes(3);
    });

    it('should clean up already acquired locks if subsequent acquisition fails', async () => {
      // First lock succeeds, second fails all retries
      mockRedis.set
        .mockResolvedValueOnce('OK') // Lock 10 succeeds
        .mockResolvedValue(null);    // Lock 20 fails
      mockRedis.eval.mockResolvedValue(1);

      const fn = jest.fn();

      await expect(lockService.withMultipleLocks([10, 20], fn)).rejects.toThrow(
        LockAcquisitionError
      );

      expect(fn).not.toHaveBeenCalled();
      // Lock 10 was acquired and must have been released in finally
      expect(mockRedis.eval).toHaveBeenCalledTimes(1);
      expect(mockRedis.eval.mock.calls[0][2]).toBe('lock:inventory:10');
    });
  });
});
