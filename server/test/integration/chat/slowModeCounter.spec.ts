import RedisClient from 'ioredis';
import { Types } from 'mongoose';
import RedisSlowModeCounter from '../../../services/core/chat/slowModeCounter';

describe('RedisSlowModeCounter', () => {
  const converseIds: string[] = [];
  let redis: RedisClient.Redis;
  let counter: RedisSlowModeCounter;

  const createIds = () => {
    const converseId = String(new Types.ObjectId());
    converseIds.push(converseId);
    return {
      converseId,
      userId: String(new Types.ObjectId()),
    };
  };

  beforeAll(async () => {
    if (!process.env.REDIS_URL) {
      throw new Error('REDIS_URL is required to test RedisSlowModeCounter');
    }

    redis = new RedisClient(process.env.REDIS_URL);
    await redis.ping();
    counter = new RedisSlowModeCounter(redis);
  });

  afterAll(async () => {
    await redis.quit();
  });

  afterEach(async () => {
    await counter.deleteByConverseIds(converseIds);
    converseIds.length = 0;
  });

  test('limits messages in a rolling window and opens the oldest slot', async () => {
    const ids = createIds();
    const start = new Date('2026-08-20T00:00:00.000Z');

    for (let index = 0; index < 5; index += 1) {
      const result = await counter.consume({
        ...ids,
        intervalSeconds: 60,
        maxMessages: 5,
        now: new Date(start.valueOf() + index * 1000),
      });
      expect(result.accepted).toBe(true);
      expect(result.remaining).toBe(4 - index);
    }

    const limited = await counter.consume({
      ...ids,
      intervalSeconds: 60,
      maxMessages: 5,
      now: new Date(start.valueOf() + 5000),
    });
    expect(limited).toMatchObject({
      accepted: false,
      remaining: 0,
      resetAt: new Date(start.valueOf() + 60000),
    });

    const released = await counter.consume({
      ...ids,
      intervalSeconds: 60,
      maxMessages: 5,
      now: new Date(start.valueOf() + 60001),
    });
    expect(released.accepted).toBe(true);
  });

  test('releases a reserved slot when message persistence fails', async () => {
    const ids = createIds();
    const now = new Date('2026-08-20T00:00:00.000Z');
    const reserved = await counter.consume({
      ...ids,
      intervalSeconds: 60,
      maxMessages: 1,
      now,
    });

    expect(reserved.accepted).toBe(true);
    expect(reserved.entryId).toBeDefined();

    await counter.release({
      ...ids,
      intervalSeconds: 60,
      maxMessages: 1,
      entryId: reserved.entryId!,
    });

    const retried = await counter.consume({
      ...ids,
      intervalSeconds: 60,
      maxMessages: 1,
      now,
    });
    expect(retried.accepted).toBe(true);
  });

  test('keeps quotas isolated by user and channel', async () => {
    const first = createIds();
    const secondUser = {
      ...first,
      userId: String(new Types.ObjectId()),
    };
    const secondChannel = createIds();
    const now = new Date('2026-08-20T00:00:00.000Z');

    await counter.consume({
      ...first,
      intervalSeconds: 60,
      maxMessages: 1,
      now,
    });

    const [sameQuota, otherUser, otherChannel] = await Promise.all([
      counter.consume({
        ...first,
        intervalSeconds: 60,
        maxMessages: 1,
        now,
      }),
      counter.consume({
        ...secondUser,
        intervalSeconds: 60,
        maxMessages: 1,
        now,
      }),
      counter.consume({
        ...secondChannel,
        intervalSeconds: 60,
        maxMessages: 1,
        now,
      }),
    ]);

    expect(sameQuota.accepted).toBe(false);
    expect(otherUser.accepted).toBe(true);
    expect(otherChannel.accepted).toBe(true);
  });

  test('allows exactly the configured count under concurrent sends', async () => {
    const ids = createIds();
    const now = new Date('2026-08-20T00:00:00.000Z');
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        counter.consume({
          ...ids,
          intervalSeconds: 60,
          maxMessages: 5,
          now,
        })
      )
    );

    expect(results.filter((result) => result.accepted)).toHaveLength(5);
    expect(results.filter((result) => !result.accepted)).toHaveLength(15);
  });

  test('resets the quota when the policy changes', async () => {
    const ids = createIds();
    const now = new Date('2026-08-20T00:00:00.000Z');

    await counter.consume({
      ...ids,
      intervalSeconds: 60,
      maxMessages: 1,
      now,
    });
    const result = await counter.consume({
      ...ids,
      intervalSeconds: 60,
      maxMessages: 5,
      now,
    });

    expect(result).toMatchObject({
      accepted: true,
      remaining: 4,
    });

    expect(await counter.deleteByConverseIds([ids.converseId])).toBe(2);
    const reset = await counter.consume({
      ...ids,
      intervalSeconds: 60,
      maxMessages: 1,
      now,
    });
    expect(reset.accepted).toBe(true);
  });

  test('uses Redis server time when application time is omitted', async () => {
    const ids = createIds();
    const before = Date.now();
    const result = await counter.consume({
      ...ids,
      intervalSeconds: 60,
      maxMessages: 1,
    });
    const after = Date.now();

    expect(result.accepted).toBe(true);
    expect(result.retryAfterMs).toBeGreaterThan(59000);
    expect(result.retryAfterMs).toBeLessThanOrEqual(60000);
    expect(result.resetAt!.valueOf()).toBeGreaterThanOrEqual(before + 60000);
    expect(result.resetAt!.valueOf()).toBeLessThanOrEqual(after + 60000);
  });
});
