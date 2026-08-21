import { randomBytes } from 'crypto';

const DEFAULT_KEY_PREFIX = 'tailchat:slow-mode:v1';

const CONSUME_SCRIPT = `
local now = tonumber(ARGV[1])
if not now then
  local redisTime = redis.call('TIME')
  now = redisTime[1] * 1000 + math.floor(redisTime[2] / 1000)
end

local windowMs = tonumber(ARGV[2])
local maxMessages = tonumber(ARGV[3])
local entryId = ARGV[4]
local cutoff = now - windowMs

redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', cutoff)
local count = redis.call('ZCARD', KEYS[1])

if count >= maxMessages then
  local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
  local resetAt = tonumber(oldest[2]) + windowMs
  redis.call('PEXPIRE', KEYS[1], windowMs)
  return { 0, 0, resetAt, math.max(resetAt - now, 0) }
end

redis.call('ZADD', KEYS[1], now, entryId)
local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
local resetAt = tonumber(oldest[2]) + windowMs
redis.call('PEXPIRE', KEYS[1], windowMs)

return { 1, maxMessages - count - 1, resetAt, math.max(resetAt - now, 0) }
`;

const STATUS_SCRIPT = `
local now = tonumber(ARGV[1])
if not now then
  local redisTime = redis.call('TIME')
  now = redisTime[1] * 1000 + math.floor(redisTime[2] / 1000)
end

local windowMs = tonumber(ARGV[2])
local maxMessages = tonumber(ARGV[3])
local cutoff = now - windowMs

redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', cutoff)
local count = redis.call('ZCARD', KEYS[1])

if count == 0 then
  redis.call('DEL', KEYS[1])
  return { maxMessages, 0 }
end

local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
redis.call('PEXPIRE', KEYS[1], windowMs)

return { math.max(maxMessages - count, 0), tonumber(oldest[2]) + windowMs }
`;

const RELEASE_SCRIPT = `
local removed = redis.call('ZREM', KEYS[1], ARGV[1])
if redis.call('ZCARD', KEYS[1]) == 0 then
  redis.call('DEL', KEYS[1])
end
return removed
`;

export interface SlowModeConsumeResult {
  accepted: boolean;
  remaining: number;
  resetAt?: Date;
  retryAfterMs?: number;
  entryId?: string;
}

export interface SlowModeRedisClient {
  eval(
    script: string,
    numberOfKeys: number,
    ...args: Array<string | number>
  ): Promise<unknown>;
  scan(
    cursor: string,
    ...args: Array<string | number>
  ): Promise<[string, string[]]>;
  del(...keys: string[]): Promise<number>;
}

interface SlowModeParams {
  converseId: string;
  userId: string;
  intervalSeconds: number;
  maxMessages: number;
  now?: Date;
}

function encodeKeyPart(value: string): string {
  return Buffer.from(value).toString('hex');
}

function escapeRedisPattern(value: string): string {
  return value.replace(/[\\*?\[\]]/g, '\\$&');
}

function parseScriptResult(result: unknown, expectedLength: number): number[] {
  if (!Array.isArray(result) || result.length !== expectedLength) {
    throw new Error('Invalid Redis slow mode script result');
  }

  const values = result.map(Number);
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error('Invalid Redis slow mode script value');
  }

  return values;
}

export class RedisSlowModeCounter {
  constructor(
    private readonly redis: SlowModeRedisClient,
    private readonly keyPrefix = DEFAULT_KEY_PREFIX
  ) {}

  private getKey(params: SlowModeParams): string {
    return [
      this.keyPrefix,
      encodeKeyPart(params.converseId),
      encodeKeyPart(params.userId),
      params.intervalSeconds,
      params.maxMessages,
    ].join(':');
  }

  async consume(params: SlowModeParams): Promise<SlowModeConsumeResult> {
    const entryId = randomBytes(16).toString('hex');
    const result = await this.redis.eval(
      CONSUME_SCRIPT,
      1,
      this.getKey(params),
      params.now?.valueOf().toString() ?? '',
      params.intervalSeconds * 1000,
      params.maxMessages,
      entryId
    );
    const [accepted, remaining, resetAt, retryAfterMs] = parseScriptResult(
      result,
      4
    );

    return {
      accepted: accepted === 1,
      remaining,
      resetAt: resetAt > 0 ? new Date(resetAt) : undefined,
      retryAfterMs,
      entryId: accepted === 1 ? entryId : undefined,
    };
  }

  async getStatus(
    params: SlowModeParams
  ): Promise<Omit<SlowModeConsumeResult, 'accepted' | 'entryId'>> {
    const result = await this.redis.eval(
      STATUS_SCRIPT,
      1,
      this.getKey(params),
      params.now?.valueOf().toString() ?? '',
      params.intervalSeconds * 1000,
      params.maxMessages
    );
    const [remaining, resetAt] = parseScriptResult(result, 2);

    return {
      remaining,
      resetAt: resetAt > 0 ? new Date(resetAt) : undefined,
    };
  }

  async release(params: SlowModeParams & { entryId: string }): Promise<void> {
    await this.redis.eval(
      RELEASE_SCRIPT,
      1,
      this.getKey(params),
      params.entryId
    );
  }

  async deleteByConverseIds(converseIds: string[]): Promise<number> {
    let deletedCount = 0;

    for (const converseId of converseIds) {
      let cursor = '0';
      const pattern = `${escapeRedisPattern(this.keyPrefix)}:${encodeKeyPart(
        converseId
      )}:*`;

      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100
        );
        cursor = nextCursor;

        if (keys.length > 0) {
          deletedCount += await this.redis.del(...keys);
        }
      } while (cursor !== '0');
    }

    return deletedCount;
  }
}

export default RedisSlowModeCounter;
